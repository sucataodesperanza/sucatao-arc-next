export const markerCategories = {
  loot: { label: 'Loot', color: '#ffd400' },
  extract: { label: 'Extracao', color: '#3df28b' },
  key: { label: 'Chave', color: '#b477ff' },
  danger: { label: 'Risco', color: '#ff6171' },
  route: { label: 'Rota', color: '#00d9ff' },
};

export const routeCategories = {
  farm: { label: 'Farm', color: '#ffd400' },
  safe: { label: 'Segura', color: '#3df28b' },
  danger: { label: 'Perigosa', color: '#ff6171' },
  extract: { label: 'Extracao', color: '#00d9ff' },
  key: { label: 'Chave', color: '#b477ff' },
};

export const mapMarkers = [
  { mapId: 'dam_battlegrounds', type: 'loot', x: 52, y: 54, title: 'Hydroponic Dome', note: 'Area boa para materiais e itens de valor medio.' },
  { mapId: 'dam_battlegrounds', type: 'danger', x: 70, y: 49, title: 'Power Generation', note: 'Setor aberto com muita linha de visao.' },
  { mapId: 'dam_battlegrounds', type: 'extract', x: 38, y: 72, title: 'Rota sul', note: 'Saida sugerida quando o centro estiver contestado.' },
  { mapId: 'dam_battlegrounds', type: 'key', x: 62, y: 67, title: 'Control Tower', note: 'Marcar aqui futuras portas, cofres ou chaves confirmadas.' },
  { mapId: 'the_spaceport', type: 'loot', x: 48, y: 42, title: 'Terminal interno', note: 'Boa area candidata para itens tecnologicos.' },
  { mapId: 'the_spaceport', type: 'extract', x: 74, y: 66, title: 'Acesso leste', note: 'Rota lateral para sair evitando o eixo central.' },
  { mapId: 'the_spaceport', type: 'danger', x: 58, y: 55, title: 'Pista aberta', note: 'Cruzar com cautela; pouco abrigo visual.' },
  { mapId: 'buried_city', type: 'loot', x: 44, y: 48, title: 'Quadras centrais', note: 'Separar por setores para busca rapida.' },
  { mapId: 'buried_city', type: 'route', x: 29, y: 61, title: 'Caminho oeste', note: 'Rota demonstrativa para farm em baixa exposicao.' },
  { mapId: 'buried_city', type: 'danger', x: 63, y: 43, title: 'Cruzamento aberto', note: 'Ponto provavel de contato entre squads.' },
  { mapId: 'the_blue_gate', type: 'key', x: 51, y: 36, title: 'Ancient Fort', note: 'Bom candidato para codigos e portas especiais.' },
  { mapId: 'the_blue_gate', type: 'loot', x: 63, y: 58, title: 'Setor fortificado', note: 'Marcar caixas raras quando confirmadas.' },
  { mapId: 'the_blue_gate', type: 'extract', x: 35, y: 72, title: 'Retirada baixa', note: 'Saida demonstrativa para rota segura.' },
  { mapId: 'stella_montis_upper', type: 'route', x: 49, y: 50, title: 'Ligacao superior', note: 'Ponto para conectar trajetos entre camadas.' },
  { mapId: 'stella_montis_upper', type: 'danger', x: 66, y: 44, title: 'Passarela exposta', note: 'Marcador teste para risco de elevacao.' },
  { mapId: 'stella_montis_lower', type: 'loot', x: 42, y: 57, title: 'Setor inferior', note: 'Area candidata para materiais subterraneos.' },
  { mapId: 'stella_montis_lower', type: 'extract', x: 61, y: 70, title: 'Saida tecnica', note: 'Rota demonstrativa de baixa visibilidade.' },
];

export const mapRoutes = [];

