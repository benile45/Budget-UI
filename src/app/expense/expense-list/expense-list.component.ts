import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import { InfiniteScrollCustomEvent, ModalController, RefresherCustomEvent } from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import {
  Category,
  CategoryCriteria,
  Expense,
  ExpenseCriteria,
  ExpenseUpsertDto,
  SortOption,
} from '../../shared/domain';
import { formatPeriod } from '../../shared/period';
import { debounce, finalize, from, groupBy, interval, mergeMap, Subscription, toArray } from 'rxjs';
import { CategoryService } from '../../category/category.service';
import { ToastService } from '../../shared/service/toast.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ExpenseService } from '../expense.service';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { group } from '@angular/animations';

interface ExpenseGroup {
  date: string;
  expenses: Expense[];
}

@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  date = set(new Date(), { date: 1 });
  expenseGroups: ExpenseGroup[] | null = null;
  readonly initialSort = 'date,desc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: this.initialSort };
  categories: Category[] = [];

  readonly searchForm: FormGroup;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Date (newest first)', value: 'date,desc' },
    { label: 'Date (oldest first)', value: 'date,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' },
  ];
  private readonly searchFormSubscription: Subscription;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly expenseService: ExpenseService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder,
  ) {
    this.searchForm = this.formBuilder.group({ name: [], sort: [this.initialSort], categoryIds: [this.categories] });
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce((value) => interval(value.name?.length ? 400 : 0)))
      .subscribe((value) => {
        this.searchCriteria = { ...this.searchCriteria, ...value, page: 0 };
        this.loadExpenses();
      });
  }

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
  };

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({ component: ExpenseModalComponent });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadExpenses();
  }

  private loadExpenses(next: () => void = () => {}): void {
    this.searchCriteria.yearMonth = formatPeriod(this.date);
    if (!this.searchCriteria.categoryIds?.length) delete this.searchCriteria.categoryIds;
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    const groupByDate = this.searchCriteria.sort.startsWith('date');
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => (this.loading = false)),
        mergeMap((expensePage) => {
          this.lastPageReached = expensePage.last;
          next();
          if (this.searchCriteria.page === 0 || !this.expenseGroups) this.expenseGroups = [];
          return from(expensePage.content).pipe(
            groupBy((expense) => (groupByDate ? expense.date : expense.id)),
            mergeMap((group) => group.pipe(toArray())),
          );
        }),
      )
      .subscribe({
        next: (expenses: Expense[]) => {
          const expenseGroup: ExpenseGroup = {
            date: expenses[0].date,
            expenses: this.sortExpenses(expenses),
          };
          const expenseGroupWithSameDate = this.expenseGroups!.find((other) => other.date === expenseGroup.date);
          if (!expenseGroupWithSameDate || !groupByDate) this.expenseGroups!.push(expenseGroup);
          else
            expenseGroupWithSameDate.expenses = this.sortExpenses([
              ...expenseGroupWithSameDate.expenses,
              ...expenseGroup.expenses,
            ]);
        },
        error: (error) => this.toastService.displayErrorToast('Could not load expenses', error),
      });
  }

  private sortExpenses = (expenses: Expense[]): Expense[] => expenses.sort((a, b) => a.name.localeCompare(b.name));

  ionViewDidEnter(): void {
    this.loadExpenses();
  }

  loadNextExpensePage($event: any) {
    this.searchCriteria.page++;
    this.loadExpenses(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }

  reloadExpenses($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription.unsubscribe();
  }
}
