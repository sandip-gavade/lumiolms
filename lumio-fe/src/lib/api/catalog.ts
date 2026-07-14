import { apiFetch } from './client';
import type {
  Category,
  CourseDetail,
  CourseLevel,
  CourseListResponse,
  ReviewsResponse,
} from '../types';

export interface ListCoursesParams {
  q?: string;
  categoryId?: string;
  level?: CourseLevel;
  minPriceCents?: number;
  maxPriceCents?: number;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export function listCourses(params: ListCoursesParams = {}) {
  return apiFetch<CourseListResponse>('/courses', { query: { ...params }, auth: false });
}

export function getCourseBySlug(slug: string) {
  return apiFetch<CourseDetail>(`/courses/${encodeURIComponent(slug)}`, { auth: false });
}

export function listCategories() {
  return apiFetch<Category[]>('/categories', { auth: false });
}

export function listReviews(courseId: string) {
  return apiFetch<ReviewsResponse>(`/courses/${courseId}/reviews`, { auth: false });
}

export function upsertReview(
  courseId: string,
  input: { rating: number; title?: string; body?: string },
) {
  return apiFetch<ReviewsResponse['reviews'][number]>(`/courses/${courseId}/reviews`, {
    method: 'POST',
    body: input,
  });
}
