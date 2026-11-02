/*
    Author: German Valencia
    GNL en tiempo real (fase B, 2026-10-25): mismo canal que la web. Entra a la sala puerto:<PUERTO>:gnl del socket, escucha
    'gnl-lectura-viva' (un pulso por brazo y por segundo), consolida los brazos y calcula cada KPI con el núcleo (nucleo/) (gnl.ts).
    El tablero sobrepone esos valores a las tarjetas marcadas con `vivo: 'gnl'`. Solo está activo mientras haya tarjetas en vivo
    en pantalla; al cambiar de puerto o de pestaña sale de la sala.
*/
/*
    OT-005 (2026-10-25): filtro por brazo como GnlStateService de la web. `brazo` = 'TODOS' (consolidado) o un brazo; los KPI,
    el tacómetro, el histórico de flujo y la temperatura siguen esa selección. `lectura` es lo que ven las gráficas.
*/
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
    ConsolidadoGnl, KPIS_GNL_VIVO, KpiGnlVivo, LecturaGnl, LecturaVistaGnl, aplicarPulsoGnl, brazosGnl, consolidarGnl, energiaPulsoGnl,
    lecturaGnlDeBrazo, valorKpiGnl,
} from '@nucleo';
import { SocketService } from './socket.service';

/** Sin pulsos en este tiempo, los valores dejan de marcarse «en vivo». */
const SIN_SENAL_MS = 15000;

@Injectable({ providedIn: 'root' })
export class GnlVivoService {
    private readonly socket = inject(SocketService);

    /** Valores en vivo por código de KPI (vacío si no hay señal). */
    readonly valores = signal<Record<string, KpiGnlVivo>>({});
    readonly consolidado = signal<ConsolidadoGnl | null>(null);
    readonly conSenal = signal(false);
    /** Brazo elegido ('TODOS' = consolidado) y brazos con pulso, como el selector del encabezado de la web. */
    readonly brazo = signal('TODOS');
    readonly brazos = signal<string[]>([]);
    /** Lectura del brazo elegido (o del consolidado): la usan el tacómetro y las gráficas en vivo. */
    readonly lectura = signal<LecturaVistaGnl | null>(null);
    /** Puerto que se está escuchando (lo usa el histórico de flujo para pedir su historial). */
    readonly puertoActivo = signal('');

    private puerto = '';
    private sala = '';
    private sub: Subscription | null = null;
    private lecturas = new Map<string, LecturaGnl>();
    private vigilante: ReturnType<typeof setInterval> | null = null;
    private ultimo = 0;
    /** «Energía acumulada»: suma de la energía de cada pulso desde que se abrió el tablero (igual que la web). */
    private energiaAcumulada = 0;
    private ultimoPulso: string | null = null;

    /** Activa o apaga la escucha para un puerto. Llamar con activo=false al salir de la pestaña. */
    seguir(puerto: string, activo: boolean): void {
        const clave = (puerto || '').toUpperCase();
        if (!activo || !clave || clave === 'TODOS') { this.detener(); return; }
        if (clave === this.puerto && this.sub) return;
        this.detener();
        this.puerto = clave;
        this.puertoActivo.set(clave);
        this.sala = SocketService.sala(clave, 'gnl');
        this.socket.unirse(this.sala);
        this.sub = this.socket.escuchar<unknown>('gnl-lectura-viva').subscribe((pulso) => this.recibir(pulso));
        this.vigilante = setInterval(() => {
            if (this.conSenal() && Date.now() - this.ultimo > SIN_SENAL_MS) this.conSenal.set(false);
        }, 5000);
    }

    /** Elige el brazo (o 'TODOS'); las gráficas se limpian y esperan el próximo pulso, como en la web. */
    seleccionarBrazo(brazo: string): void {
        const b = String(brazo || 'TODOS').trim().toUpperCase();
        if (b === this.brazo()) return;
        this.brazo.set(b);
        this.lectura.set(null);
    }

    private recibir(pulso: unknown): void {
        const todos = aplicarPulsoGnl(this.lecturas, pulso, this.puerto);
        if (!todos) return;
        this.brazos.set(brazosGnl(this.lecturas));
        // Con un brazo elegido, los KPI y las gráficas son los de ese brazo (consolidarGnl de un solo brazo)
        const elegido = this.brazo() === 'TODOS' ? null : this.lecturas.get(this.brazo());
        const c = this.brazo() === 'TODOS' ? todos : elegido ? consolidarGnl([elegido]) : null;
        this.lectura.set(lecturaGnlDeBrazo(this.lecturas, this.brazo()));
        if (!c) return;
        this.ultimo = Date.now();
        // Un pulso cuenta una sola vez (por su timestamp), como acumularEnergiaGnl de la web
        const ts = c.timestamp || null;
        if (ts && ts !== this.ultimoPulso) {
            this.ultimoPulso = ts;
            this.energiaAcumulada += energiaPulsoGnl(c) ?? 0;
        }
        this.consolidado.set(c);
        this.conSenal.set(true);
        const v: Record<string, KpiGnlVivo> = {};
        for (const codigo of Object.keys(KPIS_GNL_VIVO)) {
            const k = valorKpiGnl(codigo, c, this.energiaAcumulada);
            if (k) v[codigo] = k;
        }
        this.valores.set(v);
    }

    detener(): void {
        this.sub?.unsubscribe();
        this.sub = null;
        if (this.sala) this.socket.salir(this.sala);
        if (this.vigilante) clearInterval(this.vigilante);
        this.vigilante = null;
        this.sala = '';
        this.puerto = '';
        this.lecturas = new Map();
        this.brazos.set([]);
        this.brazo.set('TODOS');
        this.lectura.set(null);
        this.puertoActivo.set('');
        this.energiaAcumulada = 0;
        this.ultimoPulso = null;
        this.valores.set({});
        this.consolidado.set(null);
        this.conSenal.set(false);
    }
}
