// Package apidocs отдаёт OpenAPI-спецификацию и Swagger UI для мобильного
// приложения и интеграторов. Спека эмбеддится в бинарь (go:embed), UI грузит
// swagger-ui-dist с CDN и указывает на /openapi.yaml.
package apidocs

import (
	_ "embed"
	"net/http"

	"github.com/labstack/echo/v4"
)

//go:embed openapi.yaml
var specYAML []byte

// swaggerHTML — страница Swagger UI (ресурсы UI — с CDN, спека — наша /openapi.yaml).
const swaggerHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AKK Portal API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
      });
    };
  </script>
</body>
</html>`

// Register вешает маршруты документации на корневой Echo (без авторизации):
//   GET /openapi.yaml — сырая спецификация
//   GET /swagger      — браузерный Swagger UI
func Register(e *echo.Echo) {
	e.GET("/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml; charset=utf-8", specYAML)
	})
	e.GET("/swagger", func(c echo.Context) error {
		return c.HTML(http.StatusOK, swaggerHTML)
	})
}
