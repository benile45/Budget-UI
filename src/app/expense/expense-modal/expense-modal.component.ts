import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { filter, finalize, from } from 'rxjs';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../expense.service';
import { ToastService } from '../../shared/service/toast.service';
import { Category } from '../../shared/domain';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { formatISO, parseISO } from 'date-fns';
import { CategoryService } from '../../category/category.service';
import { id } from 'date-fns/locale';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {
  categories: Category[] = [];

  readonly expenseForm: FormGroup;
  submitting = false;

  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly expenseService: ExpenseService,
    private readonly formBuilder: FormBuilder,
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly toastService: ToastService,
  ) {
    this.expenseForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(40)]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [formatISO(new Date())],
      categoryId: [],
    });
  }

  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  ionViewWillEnter(): void {
    this.loadAllCategories();
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
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(filter((action) => action === 'delete'))
      .subscribe(() => this.modalCtrl.dismiss(null, 'delete'));
  }

  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryModalComponent,
      componentProps: { category: category ? { ...category } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadCategories();
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }

  private reloadCategories() {}
}
