import { color, rkiFeatureByMapId, loadCountyMap, loadEuMap, loadStateMap } from "./map_helpers";
// import 'leaflet/dist/leaflet.css'
import L, { LayerGroup, PathOptions, FeatureGroup } from 'leaflet';
import { loadCountyData } from './data-loading';
import { getElementOrThrow } from './helpers';
import { selectOrToggleCounty, observeCountyChanges, getDataOfSelectedCounty, selectedCountyRkiId } from './county-selection';


type CountyMapInfo = {
	"ID_0": number,
	"ISO": string,
	"NAME_0": string,
	"ID_1": number,
	"NAME_1": string,
	"ID_2": number,
	"NAME_2": string,
	"ID_3": number,
	"NAME_3": string,
	"NL_NAME_3": null,
	"VARNAME_3": null,
	"TYPE_3": string,
	"ENGTYPE_3": string
};

type CountyMapFeature = GeoJSON.Feature<GeoJSON.Polygon, CountyMapInfo>;

const map = L
	.map(getMapElement())
	.setView([51.163361, 10.447683], 6);

map.zoomControl.setPosition('bottomright');

function getMapElement() {
	return getElementOrThrow<HTMLDivElement>('div.map');
}

export async function loadAndDisplayMap() {
	const rkiDataResponse = loadCountyData();
	const countiesResponse = loadCountyMap();
	const preloadedStates = loadStateMap();
	const preloadedEurope = loadEuMap();

	const rkiData = await rkiDataResponse;

	function getCountyTooltip(layer: L.Layer & {feature?: CountyMapFeature}): string {
		if(layer?.feature?.properties == undefined) {
			return '';
		}
		const data = rkiFeatureByMapId(rkiData, layer.feature.properties.ID_3);
		if(data == null){
			const prop = layer.feature.properties;
			return `<b>${prop.NAME_3}, ${prop.NAME_2}</b><br>
			Noch nicht den RKI Daten zugeordnet<br><br>

			<b>Mithelfen?</b> Bitte finde in den RKI Daten den passenden Datensatz.<br>
			Bitte teile mir die ID des RKI Datensatzes und die Zahl <b>'${prop.ID_3}'</b> mit.`;
		}
		return data.county;
	}

	const countiesLayer = L.geoJSON<CountyMapInfo>(await countiesResponse, {
		style: function (feature) {
			if(feature?.properties == undefined) {
				return {};
			}
			const data = rkiFeatureByMapId(rkiData, feature?.properties.ID_3);
			return {
				color: '#888',
				weight: 0.5,
				fillColor: color(data?.cases7_per_100k),
				fillOpacity: 1,
				stroke: true,
			};
		},
		onEachFeature: function(feature, layer) {
			const rkiId = rkiFeatureByMapId(rkiData, feature?.properties.ID_3)?.OBJECTID;
			layer.on('click', () => {
				if(rkiId) {
					selectOrToggleCounty(rkiId);
				}
			});
		},
	}).bindTooltip(getCountyTooltip, {direction: 'top'})
	  .addTo(map);

	addStateBoundaries(await preloadedStates);
	addEuropeanMap(await preloadedEurope);
}

async function addStateBoundaries(preloadedMap: GeoJSON.FeatureCollection) {
	L.geoJSON(preloadedMap, {
		style: {
			color: '#888',
			weight: 2,
			fill: false
		}
	}).addTo(map);
}

async function addEuropeanMap(preloadedMap: GeoJSON.FeatureCollection) {
	L.geoJSON(preloadedMap, {
		style: {
			color: '#313232',
			fillColor: '#393a3a',
			fillOpacity: 1,
			weight: 2,
		}
	}).addTo(map);

	getMapElement().style.background = '#1d2224';
}