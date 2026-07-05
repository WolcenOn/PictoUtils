# Seguridad

Este proyecto es una aplicación web estática para generar pictogramas y tarjetas. No requiere servidor propio para sus funciones principales y evita enviar datos personales a un backend del proyecto.

## Superficie de seguridad

- Los datos de configuración, reglas personalizadas y biblioteca se guardan en `localStorage` del navegador.
- Las búsquedas de pictogramas se realizan contra ARASAAC.
- La generación de imágenes y PDF ocurre en el navegador.
- La síntesis de voz usa la API del navegador.
- Las fuentes externas se limitan al flujo de Google Fonts Share previsto por la interfaz.
- El proxy de Soyvisual, si se configura, debe ser un endpoint HTTPS de confianza.

## Cabeceras recomendadas

Se incluye un archivo `_headers` para despliegues compatibles, como Netlify o Cloudflare Pages. Estas cabeceras añaden:

- Política de seguridad de contenido compatible con jsPDF, Google Fonts, ARASAAC, blobs/PDF y proxies HTTPS.
- Bloqueo de plugins u objetos embebidos mediante `object-src 'none'`.
- Mitigación de sniffing MIME con `X-Content-Type-Options: nosniff`.
- Política de permisos que desactiva capacidades no usadas, como cámara, micrófono, geolocalización, pagos, USB, Bluetooth y sensores.
- Política de referer más restrictiva.

> Nota: GitHub Pages no aplica `_headers` de forma nativa. Si se despliega en GitHub Pages, configura estas cabeceras en el CDN/proxy frontal si lo usas.

## Recomendaciones para mantener la seguridad

1. Evitar añadir scripts de terceros salvo que sean imprescindibles.
2. Mantener jsPDF actualizado y revisar cambios antes de actualizar la versión CDN.
3. No guardar datos sensibles en reglas, bibliotecas o configuraciones exportadas.
4. Validar manualmente cualquier proxy HTTPS usado para Soyvisual.
5. Revisar que las importaciones JSON proceden de fuentes conocidas antes de cargarlas.

## Reporte de vulnerabilidades

Si encuentras un problema de seguridad, abre un issue privado o contacta con el mantenedor del repositorio antes de publicar detalles. Incluye pasos de reproducción, impacto esperado y navegador usado.
