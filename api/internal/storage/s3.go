package storage

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/spilecms/spile/api/internal/sigv4"
)

type S3Config struct {
	Provider  string `json:"provider"` // "s3", "r2", "minio"
	Bucket    string `json:"bucket"`
	Endpoint  string `json:"endpoint"`
	Region    string `json:"region"`
	AccessKey string `json:"accessKey"`
	SecretKey string `json:"secretKey"`
	PublicURL string `json:"publicUrl"`
}

type S3StorageProvider struct {
	cfg        S3Config
	httpClient *http.Client
}

func NewS3StorageProvider(cfg S3Config) (*S3StorageProvider, error) {
	if strings.TrimSpace(cfg.Bucket) == "" {
		return nil, fmt.Errorf("bucket name is required")
	}
	if strings.TrimSpace(cfg.AccessKey) == "" || strings.TrimSpace(cfg.SecretKey) == "" {
		return nil, fmt.Errorf("access key and secret key are required")
	}
	if strings.TrimSpace(cfg.Region) == "" {
		if cfg.Provider == "r2" {
			cfg.Region = "auto"
		} else {
			cfg.Region = "us-east-1"
		}
	}
	return &S3StorageProvider{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (p *S3StorageProvider) getBucketURL(key string) string {
	endpoint := strings.TrimRight(p.cfg.Endpoint, "/")
	if endpoint == "" {
		// Default AWS S3 endpoint
		endpoint = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", p.cfg.Bucket, p.cfg.Region)
		if key != "" {
			return fmt.Sprintf("%s/%s", endpoint, strings.TrimLeft(key, "/"))
		}
		return endpoint
	}

	// For R2 or MinIO (e.g. https://<account>.r2.cloudflarestorage.com/<bucket>/<key>)
	if key != "" {
		return fmt.Sprintf("%s/%s/%s", endpoint, p.cfg.Bucket, strings.TrimLeft(key, "/"))
	}
	return fmt.Sprintf("%s/%s", endpoint, p.cfg.Bucket)
}

func (p *S3StorageProvider) Save(filename string, reader io.Reader) (string, int64, error) {
	body, err := io.ReadAll(reader)
	if err != nil {
		return "", 0, fmt.Errorf("failed to read file content: %w", err)
	}

	ext := filepath.Ext(filename)
	base := strings.TrimSuffix(filepath.Base(filename), ext)
	base = strings.ReplaceAll(base, " ", "-")
	uniqueKey := fmt.Sprintf("%s-%s%s", base, uuid.NewString()[:8], ext)

	targetURL := p.getBucketURL(uniqueKey)

	req, err := http.NewRequest(http.MethodPut, targetURL, bytes.NewReader(body))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create upload request: %w", err)
	}

	mimeType := detectMimeType(filename)
	req.Header.Set("Content-Type", mimeType)

	if err := sigv4.SignRequest(req, body, p.cfg.AccessKey, p.cfg.SecretKey, p.cfg.Region, "s3", time.Now()); err != nil {
		return "", 0, fmt.Errorf("failed to sign S3 upload request: %w", err)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("failed to send S3 upload request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("S3 upload failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	publicURL := targetURL
	if strings.TrimSpace(p.cfg.PublicURL) != "" {
		basePub := strings.TrimRight(p.cfg.PublicURL, "/")
		publicURL = fmt.Sprintf("%s/%s", basePub, uniqueKey)
	}

	return publicURL, int64(len(body)), nil
}

func (p *S3StorageProvider) Delete(fileURL string) error {
	key := filepath.Base(fileURL)
	targetURL := p.getBucketURL(key)

	req, err := http.NewRequest(http.MethodDelete, targetURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}

	if err := sigv4.SignRequest(req, nil, p.cfg.AccessKey, p.cfg.SecretKey, p.cfg.Region, "s3", time.Now()); err != nil {
		return fmt.Errorf("failed to sign S3 delete request: %w", err)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send S3 delete request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 && resp.StatusCode != http.StatusNotFound {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("S3 delete failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func (p *S3StorageProvider) TestConnection() error {
	probeKey := ".spile-probe-" + uuid.NewString()[:6]
	probeData := []byte("spile-storage-check")

	targetURL := p.getBucketURL(probeKey)
	req, err := http.NewRequest(http.MethodPut, targetURL, bytes.NewReader(probeData))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "text/plain")

	if err := sigv4.SignRequest(req, probeData, p.cfg.AccessKey, p.cfg.SecretKey, p.cfg.Region, "s3", time.Now()); err != nil {
		return err
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("connection test failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	// Clean up probe object
	_ = p.Delete(probeKey)
	return nil
}

func detectMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	case ".pdf":
		return "application/pdf"
	case ".json":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}
