/*
    Author: German Valencia
    Mapa logístico móvil (fase 4): MapLibre con los mismos mapas base de la web (MapTiler) y cuatro capas
    —geocercas de los faros, naves por estado, camiones y eventos viales—. Tocar un punto muestra su ficha. Arriba a la
    izquierda, las capas, centrar y las alertas del mapa (campana con las sin leer; tocar una vuela a ella y late);
    arriba a la derecha, el botón IA flotante y debajo el zoom + / −. Sin logo de MapTiler; la atribución «i» se queda
    (la exige OpenStreetMap). OT-007, 2026-10-29. CC-242: capa de puntos de control debajo de todo (relleno por estado, como la web);
    su ficha lista cada métrica con su valor y su estado. CC-243: solo las capas que permite el rol del usuario en el canal teléfono,
    encendidas según su preferencia (la misma de la web embebida en el teléfono); un cambio se guarda en su preferencia.
*/
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import maplibregl, { GeoJSONSource, Map as MapaML, MapGeoJSONFeature, Popup } from 'maplibre-gl';
import {
  AlertaMapa, CapaNativa, COLOR_ALERTA_MAPA, capasNativas, estadoNativoParaGuardar, COLOR_CAMION, COLOR_EVENTO, COLOR_NAVE, COLOR_PUNTO_CONTROL, EstadoPuntoControl, EstiloBase, Hallazgo,
  LLAVE_ESTADO_PUNTO, MapaMovil, avisoSenalAis, colorSeveridad, estiloMapa, expresionColorNave, expresionColorPuntoControl, haceTexto,
  horizonteTexto, limitesValidos, metricasPuntoControl, tieneCoordenadas
} from '@nucleo';
import { environment } from '../../../environments/environment';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { MapaService } from '../../core/mapa.service';
import { PuertoService } from '../../core/puerto.service';
import { TemaService } from '../../core/tema.service';
import { AnalistaService } from '../../core/analista.service';
import { AlertasMapaService } from '../../core/alertas-mapa.service';
import { DispositivoService } from '../../core/dispositivo.service';

type Capa = CapaNativa;
/** Capas que se tocan para ver su ficha (las geocercas también: nombre y conteos, como el radar de la web) */
const CAPAS_CON_FICHA: Capa[] = ['puntosControl', 'geocercas', 'naves', 'camiones', 'eventos'];
const PULSO_MS = 10000;

const vacio = { type: 'FeatureCollection', features: [] } as const;
const escapar = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

@Component({
  selector: 'pm-mapa-logistico',
  standalone: true,
  imports: [TranslateModule, RouterLink, IconoComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mapa-logistico.component.html',
  styleUrl: './mapa-logistico.component.scss'
})
export class MapaLogisticoComponent implements AfterViewInit {
  readonly datos = inject(MapaService);
  readonly puertos = inject(PuertoService);
  readonly tema = inject(TemaService);
  readonly analista = inject(AnalistaService);
  readonly alertasMapa = inject(AlertasMapaService);
  readonly dispositivo = inject(DispositivoService);
  private readonly zona = inject(NgZone);
  private readonly traductor = inject(TranslateService);

  @ViewChild('lienzo', { static: true }) private lienzo!: ElementRef<HTMLDivElement>;

  readonly capas = signal<Record<Capa, boolean>>({ puntosControl: true, geocercas: true, naves: true, camiones: true, eventos: true });
  /** Capas que permite el rol (CC-243); sin respuesta del API, todas */
  readonly permitidas = computed(() => new Set(capasNativas(this.datos.capasMias()).permitidas));
  readonly base = signal<EstiloBase>('calles');
  readonly panelIA = signal(false);
  readonly menuCapas = signal(false);
  readonly listaAlertas = signal(false);
  readonly colorAlerta = COLOR_ALERTA_MAPA;
  readonly alertas = computed(() => this.analista.alertas().slice(0, 6));
  /** «Sin señal AIS hace …» cuando la fuente no reporta buques en el puerto (OT-007) */
  readonly senalAis = computed(() => avisoSenalAis(this.datos.mapa()?.senalAis));
  readonly colorNave = COLOR_NAVE;
  readonly colorCamion = COLOR_CAMION;
  readonly colorPuntoControl = COLOR_PUNTO_CONTROL;
  readonly colorEvento = COLOR_EVENTO;
  readonly color = colorSeveridad;
  readonly horizonte = horizonteTexto;

  private mapa: MapaML | null = null;
  private popup: Popup | null = null;
  private encuadrado = '';
  private estiloActual = '';
  private pulsos = new Set<maplibregl.Marker>();

  constructor() {
    const destruir = inject(DestroyRef);
    effect(() => void this.datos.seguir(this.puertos.seleccionado()), { allowSignalWrites: true });
    effect(() => this.alertasMapa.seguir(this.puertos.seleccionado()), { allowSignalWrites: true });
    const nuevas = this.alertasMapa.nueva.subscribe((a) => this.pulso(a));
    // Datos nuevos → fuentes; tema o estilo base → nuevo mapa base (las capas se vuelven a poner al cargar)
    effect(() => this.pintar(this.datos.mapa()));
    effect(() => this.aplicarEstilo(this.base(), this.tema.efectivo() === 'oscuro'));
    effect(() => this.visibilidad(this.capas()));
    // CC-243: al llegar las capas del usuario, el menú y el mapa toman su preferencia (las no permitidas quedan apagadas)
    void this.datos.cargarCapas();
    effect(() => this.capas.set(capasNativas(this.datos.capasMias()).visibles), { allowSignalWrites: true });
    destruir.onDestroy(() => {
      this.datos.detener();
      this.alertasMapa.detener();
      nuevas.unsubscribe();
      this.pulsos.forEach((p) => p.remove());
      this.popup?.remove();
      this.mapa?.remove();
      this.mapa = null;
    });
  }

  ngAfterViewInit(): void {
    this.zona.runOutsideAngular(() => {
      this.estiloActual = estiloMapa(this.base(), this.tema.efectivo() === 'oscuro', environment.mapTilerKey);
      this.mapa = new maplibregl.Map({
        container: this.lienzo.nativeElement,
        style: this.estiloActual,
        center: [-74.3, 4.6],
        zoom: 5,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false
      });
      this.mapa.touchZoomRotate.disableRotation();
      const preparar = () => { this.agregarCapas(); this.pintar(this.datos.mapa()); this.visibilidad(this.capas()); };
      this.mapa.on('style.load', preparar);
      this.mapa.on('load', preparar);
      for (const capa of CAPAS_CON_FICHA) {
        this.mapa.on('click', `capa-${capa}`, (e) => this.mostrarFicha(capa, e.features?.[0], e.lngLat));
        this.mapa.on('mouseenter', `capa-${capa}`, () => { if (this.mapa) this.mapa.getCanvas().style.cursor = 'pointer'; });
        this.mapa.on('mouseleave', `capa-${capa}`, () => { if (this.mapa) this.mapa.getCanvas().style.cursor = ''; });
      }
      // Zoom propio (botones + / − del estilo de la app, en el HTML); aquí solo la atribución compacta
      this.mapa.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    });
  }

  private agregarCapas(): void {
    const m = this.mapa;
    if (!m || m.getSource('naves')) return;
    // CC-242 · Puntos de control debajo de todo (como la web, CC-236): relleno por estado y borde de 3 px que asoma bajo las geocercas
    m.addSource('puntos-control', { type: 'geojson', data: vacio as never });
    m.addLayer({
      id: 'capa-puntosControl', type: 'fill', source: 'puntos-control',
      paint: { 'fill-color': expresionColorPuntoControl() as never, 'fill-opacity': ['case', ['==', ['get', 'estado'], 'SIN_DATO'], 0.2, 0.35] as never }
    });
    m.addLayer({
      id: 'capa-puntosControl-borde', type: 'line', source: 'puntos-control', filter: ['!', ['get', 'simulado']] as never,
      paint: { 'line-color': expresionColorPuntoControl() as never, 'line-width': 3 }
    });
    // Punteado si el estado sale de datos simulados (MapLibre no admite line-dasharray por dato: capa aparte, como la web)
    m.addLayer({
      id: 'capa-puntosControl-simulado', type: 'line', source: 'puntos-control', filter: ['get', 'simulado'] as never,
      paint: { 'line-color': expresionColorPuntoControl() as never, 'line-width': 3, 'line-dasharray': [2, 1] }
    });
    // Geocercas: relleno y borde con el color de cada faro (los de la web: 0.3 de relleno, borde de 2 px)
    m.addSource('geocercas', { type: 'geojson', data: vacio as never });
    m.addLayer({
      id: 'capa-geocercas', type: 'fill', source: 'geocercas',
      // Regla 29 (CC-286): la misma zona la pintan los puntos de control; relleno suave para no sumar opacidad
      paint: { 'fill-color': ['coalesce', ['get', 'color'], '#94A3B8'] as never, 'fill-opacity': 0.12 }
    });
    m.addLayer({
      id: 'capa-geocercas-borde', type: 'line', source: 'geocercas',
      paint: { 'line-color': ['coalesce', ['get', 'color'], '#3B82F6'] as never, 'line-width': 2 }
    });
    m.addSource('eventos', { type: 'geojson', data: vacio as never });
    m.addSource('camiones', { type: 'geojson', data: vacio as never });
    m.addSource('naves', { type: 'geojson', data: vacio as never });
    m.addLayer({
      id: 'capa-eventos', type: 'circle', source: 'eventos', paint: {
        'circle-radius': 8, 'circle-color': ['case', ['get', 'grave'], COLOR_EVENTO.grave, COLOR_EVENTO.leve] as never,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF', 'circle-opacity': 0.95
      }
    });
    m.addLayer({
      id: 'capa-camiones', type: 'circle', source: 'camiones', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 12, 5, 15, 7] as never, 'circle-color': COLOR_CAMION,
        'circle-stroke-width': 1, 'circle-stroke-color': '#FFFFFF'
      }
    });
    m.addLayer({
      id: 'capa-naves', type: 'circle', source: 'naves', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 11, 6, 14, 9] as never, 'circle-color': expresionColorNave() as never,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#0B1B2B'
      }
    });
  }

  private pintar(m: MapaMovil | null): void {
    const mapa = this.mapa;
    if (!mapa || !mapa.getSource('naves')) return;   // las fuentes existen desde 'style.load'
    (mapa.getSource('naves') as GeoJSONSource).setData((m?.naves || vacio) as never);
    (mapa.getSource('camiones') as GeoJSONSource).setData((m?.camiones || vacio) as never);
    (mapa.getSource('eventos') as GeoJSONSource).setData((m?.eventos || vacio) as never);
    (mapa.getSource('geocercas') as GeoJSONSource).setData((m?.geocercas || vacio) as never);
    (mapa.getSource('puntos-control') as GeoJSONSource).setData((m?.puntosControl || vacio) as never);
    if (m && m.puerto !== this.encuadrado && limitesValidos(m.limites)) {
      this.encuadrado = m.puerto;
      mapa.fitBounds(m.limites!, { padding: 24, duration: 600 });
    }
  }

  private aplicarEstilo(base: EstiloBase, oscuro: boolean): void {
    const url = estiloMapa(base, oscuro, environment.mapTilerKey);
    if (!this.mapa || url === this.estiloActual) return;
    this.estiloActual = url;
    this.mapa.setStyle(url);   // 'style.load' vuelve a poner las capas
  }

  private visibilidad(c: Record<Capa, boolean>): void {
    const m = this.mapa;
    if (!m || !m.getLayer('capa-naves')) return;
    (Object.keys(c) as Capa[]).forEach((k) => m.setLayoutProperty(`capa-${k}`, 'visibility', c[k] ? 'visible' : 'none'));
    m.setLayoutProperty('capa-geocercas-borde', 'visibility', c.geocercas ? 'visible' : 'none');
    for (const id of ['capa-puntosControl-borde', 'capa-puntosControl-simulado']) m.setLayoutProperty(id, 'visibility', c.puntosControl ? 'visible' : 'none');
  }

  alternarCapa(c: Capa): void {
    const nuevas = { ...this.capas(), [c]: !this.capas()[c] };
    this.capas.set(nuevas);
    const mias = this.datos.capasMias();
    if (mias) void this.datos.guardarCapas(estadoNativoParaGuardar(mias, nuevas));
  }

  private mostrarFicha(capa: Capa, f: MapGeoJSONFeature | undefined, lngLat: maplibregl.LngLat): void {
    if (!f || !this.mapa) return;
    const p = f.properties as Record<string, unknown>;
    const t = (k: string) => this.traductor.instant(k);
    let html = '';
    // CC-249: abre solo la ficha del objeto de encima: naves y camiones → eventos viales → geocercas (como la web)
    const encimaDe: Partial<Record<Capa, string[]>> = { geocercas: ['capa-naves', 'capa-camiones', 'capa-eventos'], eventos: ['capa-naves', 'capa-camiones'] };
    const capasEncima = (encimaDe[capa] || []).filter((c) => this.mapa!.getLayer(c));
    if (capasEncima.length && this.mapa.queryRenderedFeatures(this.mapa.project(lngLat), { layers: capasEncima }).length) return;
    if (capa === 'puntosControl') {
      // El punto de control cede la ficha al elemento que tenga encima (como la web, CC-236)
      const encima = this.mapa.queryRenderedFeatures(this.mapa.project(lngLat), { layers: ['capa-geocercas', 'capa-naves', 'capa-camiones', 'capa-eventos'] });
      if (encima.length) return;
      const estado = (p['estado'] as EstadoPuntoControl) || 'SIN_DATO';
      const pastilla = (e: EstadoPuntoControl) => `<span class="ficha-estado" style="background:${COLOR_PUNTO_CONTROL[e] || COLOR_PUNTO_CONTROL.SIN_DATO}">${escapar(t(LLAVE_ESTADO_PUNTO[e] || LLAVE_ESTADO_PUNTO.SIN_DATO))}</span>`;
      const filas = metricasPuntoControl(p['metricas'] as string).map((x) => {
        const valor = x.valor === null || x.valor === undefined ? '—' : `${escapar(Math.round(Number(x.valor) * 100) / 100)} ${escapar(x.unidad || '')}`;
        return `<small><i class="pm-ficha-punto" style="background:${COLOR_PUNTO_CONTROL[x.estado] || COLOR_PUNTO_CONTROL.SIN_DATO}"></i>${escapar(x.nombre)}: ${valor}${x.simulado ? ` · ${escapar(t('COMMON.SIMULATED_2'))}` : ''}</small>`;
      }).join('');
      html = `<strong>${escapar(p['nombre'])}</strong>${pastilla(estado)}` + (p['tipo'] ? `<small>${escapar(String(p['tipo']).replace(/_/g, ' '))}</small>` : '') + filas;
    } else if (capa === 'geocercas') {
      html = `<strong>${escapar(p['nombre'])}</strong>` + (p['tipo'] ? `<small>${escapar(p['tipo'])}</small>` : '')
        + `<small>${escapar(t('MOVIL.WIDGETS.MAPA_LOGISTICO.VESSELS'))}: ${escapar(p['naves'] ?? 0)} · ${escapar(t('COMMON.TRUCKS'))}: ${escapar(p['camiones'] ?? 0)}</small>`;
    } else if (capa === 'naves') {
      html = `<strong>${escapar(p['nombre'])}</strong><span class="ficha-estado" style="background:${COLOR_NAVE[p['estado'] as keyof typeof COLOR_NAVE] || COLOR_NAVE.sin_dato}">${escapar(t('MOVIL.ENUM.VESSEL_STATUS.' + String(p['estado']).toUpperCase()))}</span>`
        + (p['velocidad'] !== null && p['velocidad'] !== undefined ? `<small>${escapar(p['velocidad'])} kn · ${escapar(p['rumbo'] ?? '—')}°</small>` : '')
        + (p['instalacion'] ? `<small>${escapar(p['instalacion'])}${p['agencia'] ? ' · ' + escapar(p['agencia']) : ''}</small>` : '')
        + (p['minutos'] !== null && p['minutos'] !== undefined ? `<small>${escapar(t('MOVIL.WIDGETS.MAPA_LOGISTICO.LAST_POSITION'))} ${escapar(haceTexto(Number(p['minutos'])))}</small>` : '');
    } else if (capa === 'camiones') {
      html = `<strong>${escapar(p['placa'] || t('MOVIL.WIDGETS.MAPA_LOGISTICO.TRUCK'))}</strong><small>${escapar(String(p['estado']).replace(/_/g, ' '))}</small>`
        + (p['velocidad'] !== null && p['velocidad'] !== undefined ? `<small>${escapar(p['velocidad'])} km/h</small>` : '');
    } else {
      html = `<strong>${escapar(p['descripcion'] || p['tipo'])}</strong><small>${escapar([p['corredor'], p['sector']].filter(Boolean).join(' · '))}</small>`
        + `<small>${escapar(String(p['tipo']).replace(/_/g, ' '))}</small>`;
    }
    this.popup?.remove();
    this.popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px', className: 'pm-ficha' }).setLngLat(lngLat).setHTML(html).addTo(this.mapa);
  }

  acercar(): void { this.mapa?.zoomIn({ duration: 250 }); }
  alejar(): void { this.mapa?.zoomOut({ duration: 250 }); }

  alternarListaAlertas(): void {
    const abrir = !this.listaAlertas();
    this.listaAlertas.set(abrir);
    if (abrir) { this.menuCapas.set(false); this.alertasMapa.marcarLeidas(); }
  }

  /** Tocar una alerta: el mapa vuela a su punto y vuelve a latir (como enfocarAlerta de la web). */
  enfocarAlerta(a: AlertaMapa): void {
    if (!this.mapa || !tieneCoordenadas(a)) return;
    this.listaAlertas.set(false);
    this.mapa.flyTo({ center: a.coordenadas!, zoom: Math.max(this.mapa.getZoom(), 13), duration: 1500, essential: true });
    this.pulso(a);
  }

  conPunto(a: AlertaMapa): boolean {
    return tieneCoordenadas(a);
  }

  /** Anillo que late en el punto de la alerta con el color de su nivel; se quita solo a los 10 s. */
  private pulso(a: AlertaMapa): void {
    if (!this.mapa || !tieneCoordenadas(a)) return;
    const el = document.createElement('div');
    el.className = 'pm-pulso-alerta';
    el.style.color = COLOR_ALERTA_MAPA[a.nivel];
    const marcador = new maplibregl.Marker({ element: el }).setLngLat(a.coordenadas!).addTo(this.mapa);
    this.pulsos.add(marcador);
    setTimeout(() => { marcador.remove(); this.pulsos.delete(marcador); }, PULSO_MS);
  }

  centrar(): void {
    const m = this.datos.mapa();
    if (m && this.mapa && limitesValidos(m.limites)) this.mapa.fitBounds(m.limites!, { padding: 24, duration: 600 });
  }

  trackAlerta(_: number, a: Hallazgo): number {
    return a.id;
  }
}
