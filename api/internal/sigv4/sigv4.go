package sigv4

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

func sha256Hex(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

func hmacSHA256(key []byte, data string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(data))
	return mac.Sum(nil)
}

// SignRequest applies AWS Signature Version 4 authentication headers to an HTTP request.
func SignRequest(req *http.Request, body []byte, accessKey, secretKey, region, service string, now time.Time) error {
	if region == "" {
		region = "us-east-1"
	}
	if service == "" {
		service = "s3"
	}

	dateStamp := now.UTC().Format("20060102")
	amzDate := now.UTC().Format("20060102T150405Z")

	payloadHash := sha256Hex(body)
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", payloadHash)
	if req.Header.Get("Host") == "" && req.URL.Host != "" {
		req.Header.Set("Host", req.URL.Host)
	}

	// 1. Build Canonical Headers & Signed Headers
	headerMap := make(map[string]string)
	var headerNames []string
	for k, vals := range req.Header {
		lowerKey := strings.ToLower(k)
		headerMap[lowerKey] = strings.TrimSpace(strings.Join(vals, ","))
		headerNames = append(headerNames, lowerKey)
	}
	if _, ok := headerMap["host"]; !ok && req.URL.Host != "" {
		headerMap["host"] = req.URL.Host
		headerNames = append(headerNames, "host")
	}

	sort.Strings(headerNames)
	var canonicalHeaders strings.Builder
	for _, k := range headerNames {
		canonicalHeaders.WriteString(fmt.Sprintf("%s:%s\n", k, headerMap[k]))
	}
	signedHeaders := strings.Join(headerNames, ";")

	// 2. Canonical URI
	canonicalURI := req.URL.Path
	if canonicalURI == "" {
		canonicalURI = "/"
	}

	// 3. Canonical Query String
	canonicalQuery := ""
	if req.URL.RawQuery != "" {
		values, err := url.ParseQuery(req.URL.RawQuery)
		if err == nil {
			var queryKeys []string
			for k := range values {
				queryKeys = append(queryKeys, k)
			}
			sort.Strings(queryKeys)
			var qParts []string
			for _, k := range queryKeys {
				v := values[k]
				sort.Strings(v)
				for _, item := range v {
					qParts = append(qParts, fmt.Sprintf("%s=%s", url.QueryEscape(k), url.QueryEscape(item)))
				}
			}
			canonicalQuery = strings.Join(qParts, "&")
		}
	}

	// 4. Canonical Request
	canonicalRequest := fmt.Sprintf(
		"%s\n%s\n%s\n%s\n%s\n%s",
		req.Method,
		canonicalURI,
		canonicalQuery,
		canonicalHeaders.String(),
		signedHeaders,
		payloadHash,
	)

	// 5. String to Sign
	credentialScope := fmt.Sprintf("%s/%s/%s/aws4_request", dateStamp, region, service)
	stringToSign := fmt.Sprintf(
		"AWS4-HMAC-SHA256\n%s\n%s\n%s",
		amzDate,
		credentialScope,
		sha256Hex([]byte(canonicalRequest)),
	)

	// 6. Calculate Signature Key
	kDate := hmacSHA256([]byte("AWS4"+secretKey), dateStamp)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	kSigning := hmacSHA256(kService, "aws4_request")

	signature := hex.EncodeToString(hmacSHA256(kSigning, stringToSign))

	// 7. Add Authorization Header
	authHeader := fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		accessKey,
		credentialScope,
		signedHeaders,
		signature,
	)
	req.Header.Set("Authorization", authHeader)
	return nil
}
