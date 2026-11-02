/*
    Author: German Valencia
    Ingreso a Porttos móvil. Mismo diseño y textos del login web (AUTENTICACION.LOGIN.*):
    fondo del slider, tarjeta translúcida con el logo de Porttos y «Acceso a Usuarios» (el logo reemplazó la palabra «Plataforma», 2026-10-25), Recordarme e «Iniciar Sesión».
    Fase 4: ingreso con huella o Face ID. Se ofrece una vez después de entrar con usuario y clave; si está activo,
    al abrir el ingreso se pide la biometría directamente (salvo que la sesión se haya cerrado con un aviso).
*/
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconoComponent } from '../../compartido/icono.component';
import { SesionService } from '../../core/sesion.service';
import { IdiomaService } from '../../core/idioma.service';
import { BiometriaService } from '../../core/biometria.service';

@Component({
    selector: 'pm-login',
    standalone: true,
    imports: [ReactiveFormsModule, TranslateModule, IconoComponent],
    templateUrl: './login.page.html',
    styleUrl: './login.page.scss'
})
export class LoginPage implements OnInit {
    readonly verClave = signal(false);
    readonly enviando = signal(false);
    readonly error = signal('');
    readonly aviso = signal('');
    /** Después de entrar: ¿activar el ingreso con biometría? (credenciales solo en memoria mientras se decide) */
    readonly ofreciendo = signal(false);
    private pendiente: { usuario: string; clave: string } | null = null;

    readonly form = this.fb.nonNullable.group({
        usuario: ['', Validators.required],
        clave: ['', Validators.required],
        recordar: [true]
    });

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private traductor: TranslateService,
        readonly sesion: SesionService,
        readonly idioma: IdiomaService,
        readonly biometria: BiometriaService
    ) {}

    async ngOnInit(): Promise<void> {
        const ultimo = await this.sesion.ultimoUsuario();
        if (ultimo) this.form.patchValue({ usuario: ultimo });
        this.error.set(this.sesion.avisoCierre());
        await this.biometria.iniciar();
        if (this.biometria.activa() && !this.error()) void this.conBiometria();
    }

    get llaveBiometria(): string {
        return this.biometria.tipo() === 'rostro' ? 'MOVIL.LOGIN.CON_ROSTRO' : 'MOVIL.LOGIN.CON_HUELLA';
    }

    invalido(campo: 'usuario' | 'clave'): boolean {
        const c = this.form.controls[campo];
        return c.invalid && (c.touched || c.dirty);
    }

    async ingresar(): Promise<void> {
        if (this.enviando()) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.enviando.set(true);
        this.error.set('');
        const { usuario, clave, recordar } = this.form.getRawValue();
        try {
            await this.sesion.iniciar(usuario.trim(), clave, recordar);
            if (this.biometria.ofrecer()) {
                this.pendiente = { usuario: usuario.trim(), clave };
                this.ofreciendo.set(true);
                return;
            }
            await this.entrar();
        } catch (e) {
            this.error.set((e as Error).message);
        } finally {
            this.enviando.set(false);
        }
    }

    async conBiometria(): Promise<void> {
        if (this.enviando()) return;
        this.error.set('');
        const c = await this.biometria.obtener(this.traductor.instant('MOVIL.LOGIN.MOTIVO_BIOMETRIA'));
        if (!c) return;                                   // canceló: queda el ingreso normal
        this.enviando.set(true);
        try {
            await this.sesion.iniciar(c.usuario, c.clave, true);
            await this.entrar();
        } catch (e) {
            const msg = (e as Error).message || '';
            if (/credenciales|clave|contraseña|inactivo/i.test(msg)) {
                await this.biometria.desactivar();
                this.error.set(this.traductor.instant('MOVIL.LOGIN.BIOMETRIA_INVALIDA'));
            } else {
                this.error.set(msg);
            }
        } finally {
            this.enviando.set(false);
        }
    }

    async activarBiometria(): Promise<void> {
        const p = this.pendiente;
        this.pendiente = null;
        if (p) {
            const ok = await this.biometria.activar(p.usuario, p.clave, this.traductor.instant('MOVIL.LOGIN.MOTIVO_ACTIVAR'));
            if (!ok) this.aviso.set('MOVIL.LOGIN.BIOMETRIA_NO_ACTIVADA');
        }
        await this.entrar();
    }

    async ahoraNo(): Promise<void> {
        this.pendiente = null;
        await this.biometria.noGracias();
        await this.entrar();
    }

    private async entrar(): Promise<void> {
        this.ofreciendo.set(false);
        this.form.controls.clave.reset('');
        await this.router.navigateByUrl('/app/tablero', { replaceUrl: true });
    }
}
