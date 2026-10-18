export function urlApp(pagina?: string): string {
  const inicio = import.meta.env.BASE_URL;
  return pagina ? `${inicio}?page=${encodeURIComponent(pagina)}` : inicio;
}
