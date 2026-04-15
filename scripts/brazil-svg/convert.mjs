import * as shapefile from 'shapefile';
import * as fs from 'fs';
import * as path from 'path';
import * as d3 from 'd3-geo';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const features = [];

  const shpPath = path.join(__dirname, 'br_uf', 'BR_UF_2022.shp');
  console.log('Reading from:', shpPath);

  const geojson = await shapefile.read(shpPath);

  for (const feature of geojson.features) {
    const props = feature.properties;
    const uf = props.SIGLA_UF || props.SIGLA || props.CD_UF;
    const name = props.NM_UF || props.NOME || '';
    features.push({
      type: 'Feature',
      properties: { uf, name },
      geometry: feature.geometry
    });
  }

  console.log(`Found ${features.length} states`);
  console.log('All UFs:', features.map(f => f.properties.uf).join(', '));

  // Use a Brazil-appropriate projection (Mercator fitted to bounds)
  const collection = { type: 'FeatureCollection', features };
  const projection = d3.geoMercator()
    .fitSize([800, 700], collection);

  const pathGen = d3.geoPath(projection);

  // Generate paths
  const statePaths = {};
  for (const feature of features) {
    const d = pathGen(feature);
    if (d) {
      statePaths[feature.properties.uf] = d;
    }
  }

  const width = 800;
  const height = 700;

  const result = {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    states: statePaths,
    stateNames: Object.fromEntries(features.map(f => [f.properties.uf, f.properties.name]))
  };

  const outPath = path.join(__dirname, 'brazil-states.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('Written to:', outPath);
  console.log(`ViewBox: ${result.viewBox}`);
  console.log(`States count: ${Object.keys(result.states).length}`);

  // Print a sample
  const firstUf = Object.keys(result.states)[0];
  console.log(`Sample (${firstUf}): ${result.states[firstUf].substring(0, 100)}...`);
}

main().catch(console.error);
