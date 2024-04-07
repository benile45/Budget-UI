import { Component } from '@angular/core';
import { ModalController, RefresherCustomEvent } from '@ionic/angular';
import { filter, finalize, from, groupBy, mergeMap, tap, toArray } from 'rxjs';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../expense.service';
import { ToastService } from '../../shared/service/toast.service';
import { Category, Expense, ExpenseCriteria, ExpenseUpsertDto } from '../../shared/domain';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { formatISO, parseISO } from 'date-fns';
import { CategoryService } from '../../category/category.service';
import { id } from 'date-fns/locale';
import { formatPeriod } from '../../shared/period';
import { load } from '@angular-devkit/build-angular/src/utils/server-rendering/esm-in-memory-file-loader';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {
  categories: Category[] = [];

  readonly expenseForm: FormGroup;
  submitting = false;

  // Passed into the component by the ModalController, available in the ionViewWillEnter
  expense: Expense = {} as Expense;

  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly expenseService: ExpenseService,
    private readonly formBuilder: FormBuilder,
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly toastService: ToastService,
  ) {
    this.expenseForm = this.formBuilder.group({
      id: [],
      name: ['', [Validators.required, Validators.maxLength(40)]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [formatISO(new Date())],
      categoryId: [undefined],
    });
  }

  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  ionViewWillEnter(): void {
    const { id, amount, category, date, name } = this.expense;
    this.expenseForm.patchValue({ id, amount, categoryId: category?.id, date, name });
    this.loadAllCategories();
    console.log('Loaded expense:', this.expense);
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.submitting = true;
    this.expenseService
      .upsertExpense({
        ...this.expenseForm.value,
        date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense saved');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
      });
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this delete?'))
      .pipe(
        filter((action) => action === 'delete'),
        tap(() => (this.submitting = true)),
        mergeMap(() => this.expenseService.deleteExpense(this.expense.id!)),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense deleted');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not delete expense', error),
      });
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }
}
