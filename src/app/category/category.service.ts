import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllCategoryCriteria, Category, CategoryCriteria, Page } from '../shared/domain';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = `${environment.backendUrl}/categories`;
  private readonly apiV2Url = `${environment.backendUrl}/v2/categories`;

  constructor(private readonly httpClient: HttpClient) {}

  // Read

  getCategories = (pagingCriteria: CategoryCriteria): Observable<Page<Category>> =>
    this.httpClient.get<Page<Category>>(this.apiUrl, { params: new HttpParams({ fromObject: { ...pagingCriteria } }) });

  getAllCategories = (sortCriteria: AllCategoryCriteria): Observable<Category[]> =>
    this.httpClient.get<Category[]>(this.apiV2Url, { params: new HttpParams({ fromObject: { ...sortCriteria } }) });

  // Create & Update

  upsertCategory = (category: Category): Observable<void> => this.httpClient.put<void>(this.apiUrl, category);

  // Delete

  deleteCategory = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
}
