import { apiFetch } from './client';
import type { Certificate, CourseProgress, MyLearningResponse, Note, Question } from '../types';

export function getMyLearning() {
  return apiFetch<MyLearningResponse>('/my-learning');
}

export function getCourseProgress(courseId: string) {
  return apiFetch<CourseProgress>(`/courses/${courseId}/progress`);
}

export function updateLectureProgress(
  lectureId: string,
  input: { positionSeconds: number; completed?: boolean },
) {
  return apiFetch(`/lectures/${lectureId}/progress`, { method: 'POST', body: input });
}

export function listLectureNotes(lectureId: string) {
  return apiFetch<Note[]>(`/lectures/${lectureId}/notes`);
}

export function createNote(lectureId: string, input: { timestampSeconds: number; body: string }) {
  return apiFetch<Note>(`/lectures/${lectureId}/notes`, { method: 'POST', body: input });
}

export function updateNote(noteId: string, body: string) {
  return apiFetch<Note>(`/notes/${noteId}`, { method: 'PATCH', body: { body } });
}

export function deleteNote(noteId: string) {
  return apiFetch<void>(`/notes/${noteId}`, { method: 'DELETE' });
}

export function listQuestions(courseId: string) {
  return apiFetch<Question[]>(`/courses/${courseId}/questions`, { auth: false });
}

export function askQuestion(courseId: string, input: { body: string; lectureId?: string }) {
  return apiFetch<Question>(`/courses/${courseId}/questions`, { method: 'POST', body: input });
}

export function answerQuestion(questionId: string, body: string) {
  return apiFetch(`/questions/${questionId}/answers`, { method: 'POST', body: { body } });
}

export function listMyCertificates() {
  return apiFetch<Certificate[]>('/certificates/mine');
}

export function getCertificate(id: string) {
  return apiFetch<Certificate>(`/certificates/${id}`);
}
