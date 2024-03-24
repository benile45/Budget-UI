import { Component, Injector } from '@angular/core';
import { categoriesPath, expensesPath } from './shared/routes';
import { AuthService } from './shared/service/auth.service';
import { UpdateService } from './shared/service/update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  readonly appPages = [
    { title: 'Expenses', url: `/${expensesPath}`, icon: 'podium' },
    { title: 'Categories', url: `/${categoriesPath}`, icon: 'pricetag' },
  ];

  constructor(
    readonly authService: AuthService,
    private readonly injector: Injector,
  ) {
    this.injector.get(UpdateService); // Reference UpdateService here as it won't be created otherwise
  }
}
