package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// Provider abstracts file storage (Local disk, S3, R2)
type Provider interface {
	Save(filename string, reader io.Reader) (string, int64, error)
	Delete(fileURL string) error
}

// LocalStorageProvider implements Provider for local filesystem storage
type LocalStorageProvider struct {
	BaseDir   string
	PublicURL string
}

func NewLocalStorageProvider(baseDir, publicURL string) (*LocalStorageProvider, error) {
	if baseDir == "" {
		baseDir = "./uploads"
	}
	if publicURL == "" {
		publicURL = "/uploads"
	}

	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	return &LocalStorageProvider{
		BaseDir:   baseDir,
		PublicURL: strings.TrimSuffix(publicURL, "/"),
	}, nil
}

func (p *LocalStorageProvider) Save(filename string, reader io.Reader) (string, int64, error) {
	ext := filepath.Ext(filename)
	base := strings.TrimSuffix(filepath.Base(filename), ext)
	// Clean base name
	base = strings.ReplaceAll(base, " ", "-")

	uniqueName := fmt.Sprintf("%s-%s%s", base, uuid.NewString()[:8], ext)
	targetPath := filepath.Join(p.BaseDir, uniqueName)

	dst, err := os.Create(targetPath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create file on disk: %w", err)
	}
	defer dst.Close()

	size, err := io.Copy(dst, reader)
	if err != nil {
		_ = os.Remove(targetPath)
		return "", 0, fmt.Errorf("failed to write file: %w", err)
	}

	fileURL := fmt.Sprintf("%s/%s", p.PublicURL, uniqueName)
	return fileURL, size, nil
}

func (p *LocalStorageProvider) Delete(fileURL string) error {
	filename := filepath.Base(fileURL)
	targetPath := filepath.Join(p.BaseDir, filename)
	if err := os.Remove(targetPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
