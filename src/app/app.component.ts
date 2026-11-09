/*
    Author: German Valencia
    Componente raíz: solo el router. Oculta la pantalla de carga nativa cuando Angular ya pintó
    y reconecta el socket al volver la app al primer plano.
*/
import { AfterViewInit, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NativoService } from './core/nativo.service';
import { SocketService } from './core/socket.service';

@Component({
    selector: 'pm-raiz',
    standalone: true,
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class RaizComponent implements AfterViewInit {
    constructor(private nativo: NativoService, private socket: SocketService) {
        this.nativo.alVolver(() => this.socket.reanudar());
    }

    ngAfterViewInit(): void {
        void this.nativo.ocultarCarga();
    }
}
