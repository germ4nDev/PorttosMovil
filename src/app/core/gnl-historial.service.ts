/*
    Author: German Valencia
    Historial de la telemetría GNL (OT-005): el mismo endpoint que la vista ampliada del histórico de flujo de la web
    (GnlHistorialService). GET /api/gnl-telemetria/historial/:puerto?horas=24|72|168 → serie por hora y volumen por brazo.
*/
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HistorialGnl } from '@nucleo';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GnlHistorialService {
    private readonly http = inject(HttpClient);

    async historial(puerto: string, horas: number): Promise<HistorialGnl> {
        const p = encodeURIComponent(String(puerto || '').trim().toUpperCase());
        const r = await firstValueFrom(this.http.get<{ ok: boolean; data: HistorialGnl }>(
            `${environment.apiUrl}/gnl-telemetria/historial/${p}`, { params: { horas: String(horas) } }));
        return r.data;
    }
}
