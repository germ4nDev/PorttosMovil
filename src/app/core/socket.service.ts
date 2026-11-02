/*
    Author: German Valencia
    Tiempo real (Socket.IO): mismo servidor y mismo handshake que la web
    (auth: { token, codigoUsuario, codigoSesion } validado por socketAuth) y mismas salas por puerto.
    Los oyentes y las salas sobreviven a reconexiones y a un nuevo inicio de sesión (se vuelven a enganchar).
*/
import { Injectable, NgZone, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { SesionPorttos } from '@nucleo';
import { environment } from '../../environments/environment';

type Oyente = (dato: unknown) => void;

@Injectable({ providedIn: 'root' })
export class SocketService {
    readonly conectado = signal(false);
    private socket: Socket | null = null;
    private salas = new Set<string>();
    private oyentes = new Map<string, Set<Oyente>>();

    constructor(private zona: NgZone) {}

    conectar(s: SesionPorttos): void {
        this.cerrarSocket();
        this.socket = io(environment.sctUrl, {
            autoConnect: false,
            reconnection: true,
            transports: ['polling', 'websocket'],
            auth: { token: s.token, codigoUsuario: s.codigoUsuario, codigoSesion: s.codigoSesion }
        });
        this.socket.on('connect', () => this.zona.run(() => {
            this.conectado.set(true);
            this.socket?.emit('vincular_socket_sesion', { codigoSesion: s.codigoSesion });
            // Las salas no sobreviven a una reconexión: se restauran aquí (igual que la web)
            this.salas.forEach((sala) => this.socket?.emit('unirse-sala', sala));
        }));
        this.socket.on('disconnect', () => this.zona.run(() => this.conectado.set(false)));
        this.oyentes.forEach((fns, evento) => fns.forEach((fn) => this.socket?.on(evento, fn)));
        this.socket.connect();
    }

    private cerrarSocket(): void {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.conectado.set(false);
    }

    /** Al cerrar sesión: sin socket ni salas (los oyentes de los servicios quedan para la próxima sesión). */
    desconectar(): void {
        this.cerrarSocket();
        this.salas.clear();
    }

    /** Reintenta al volver la app al primer plano. */
    reanudar(): void {
        if (this.socket && !this.socket.connected) this.socket.connect();
    }

    /** Sala de un módulo para un puerto, mismo formato que la web: puerto:<PUERTO>:maritimo */
    static sala(puerto: string, modulo: string): string {
        return `puerto:${puerto.toUpperCase()}:${modulo}`;
    }

    unirse(sala: string): void {
        this.salas.add(sala);
        this.socket?.emit('unirse-sala', sala);
    }

    salir(sala: string): void {
        this.salas.delete(sala);
        this.socket?.emit('salir-sala', sala);
    }

    escuchar<T = unknown>(evento: string): Observable<T> {
        return new Observable<T>((obs) => {
            const fn: Oyente = (dato) => this.zona.run(() => obs.next(dato as T));
            if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
            this.oyentes.get(evento)!.add(fn);
            this.socket?.on(evento, fn);
            return () => {
                this.oyentes.get(evento)?.delete(fn);
                this.socket?.off(evento, fn);
            };
        });
    }

    emitir(evento: string, dato?: unknown): void {
        this.socket?.emit(evento, dato);
    }
}
