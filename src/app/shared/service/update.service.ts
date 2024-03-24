import { ApplicationRef, Injectable, OnDestroy } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, filter, from, interval, mergeMap, Subscription, tap } from 'rxjs';
import { first } from 'rxjs/operators';
import { ActionSheetService } from './action-sheet.service';

@Injectable({ providedIn: 'root' })
export class UpdateService implements OnDestroy {
  private readonly versionUpdateSubscription: Subscription;
  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly appRef: ApplicationRef,
    private readonly updates: SwUpdate,
  ) {
    console.log('Service worker enabled: ', this.updates.isEnabled);
    // Trigger the update check every hour.
    // Allow the app to stabilize first before starting polling for updates with `interval()`.
    concat(this.appRef.isStable.pipe(first((isStable) => isStable)), interval(60 * 60 * 1000)).subscribe(async () => {
      try {
        console.debug('Checking for updates');
        const updateFound = await this.updates.checkForUpdate();
        console.debug(updateFound ? 'A new version is available.' : 'Already on the latest version.');
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    });

    // Listen for update notifications & reload if user accepts
    this.versionUpdateSubscription = this.updates.versionUpdates
      .pipe(
        tap((evt) => console.debug('Update event:', evt)),
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        mergeMap(() => from(this.actionSheetService.showUpdateConfirmation())),
        filter((action) => action === 'update'),
      )
      .subscribe(() => document.location.reload());
  }

  ngOnDestroy(): void {
    this.versionUpdateSubscription.unsubscribe();
  }
}
