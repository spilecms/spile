package testutils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
)

// RequestClient is a fluent HTTP test client
type RequestClient struct {
	app     *TestApp
	token   string
	headers map[string]string
}

func (app *TestApp) Client() *RequestClient {
	return &RequestClient{
		app:     app,
		headers: make(map[string]string),
	}
}

func (c *RequestClient) WithToken(token string) *RequestClient {
	c.token = token
	return c
}

func (c *RequestClient) WithHeader(key, val string) *RequestClient {
	c.headers[key] = val
	return c
}

func (c *RequestClient) Do(method, path string, body []byte) *httptest.ResponseRecorder {
	var req *http.Request
	if len(body) > 0 {
		req = httptest.NewRequest(method, path, bytes.NewReader(body))
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	for k, v := range c.headers {
		req.Header.Set(k, v)
	}

	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
		req.AddCookie(&http.Cookie{
			Name:  "spile_session",
			Value: c.token,
		})
	}

	w := httptest.NewRecorder()
	c.app.Router.ServeHTTP(w, req)
	return w
}

func (c *RequestClient) Get(path string) *httptest.ResponseRecorder {
	return c.Do(http.MethodGet, path, nil)
}

func (c *RequestClient) PostJSON(path string, payload any) *httptest.ResponseRecorder {
	body, _ := json.Marshal(payload)
	c.headers["Content-Type"] = "application/json"
	return c.Do(http.MethodPost, path, body)
}

func (c *RequestClient) PutJSON(path string, payload any) *httptest.ResponseRecorder {
	body, _ := json.Marshal(payload)
	c.headers["Content-Type"] = "application/json"
	return c.Do(http.MethodPut, path, body)
}

func (c *RequestClient) Delete(path string) *httptest.ResponseRecorder {
	return c.Do(http.MethodDelete, path, nil)
}
