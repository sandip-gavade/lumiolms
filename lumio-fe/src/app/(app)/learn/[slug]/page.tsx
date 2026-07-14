'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Download, FileText, Play } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/spinner';
import { Textarea } from '@/components/input';
import { useToast } from '@/components/toast';
import { getCourseBySlug } from '@/lib/api/catalog';
import { ApiError } from '@/lib/api/client';
import * as learningApi from '@/lib/api/learning';
import { getMyLearning } from '@/lib/api/learning';
import { durationLabel, initialsOf, relativeTime, timestampLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { avatarColorFor } from '@/lib/visuals';
import type { Lecture } from '@/lib/types';

type Tab = 'overview' | 'notes' | 'qa';

function PlayerContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [noteText, setNoteText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: queryKeys.course(params.slug),
    queryFn: () => getCourseBySlug(params.slug),
  });
  const { data: myLearning } = useQuery({ queryKey: queryKeys.myLearning, queryFn: getMyLearning });
  const enrolled = useMemo(
    () => myLearning?.courses.some((c) => c.course.slug === params.slug),
    [myLearning, params.slug],
  );

  const { data: progress } = useQuery({
    queryKey: course ? queryKeys.courseProgress(course.id) : ['course-progress', 'pending'],
    queryFn: () => learningApi.getCourseProgress(course!.id),
    enabled: !!course,
  });

  const flatLectures = useMemo<{ lecture: Lecture; sectionTitle: string }[]>(() => {
    if (!course) return [];
    return course.sections.flatMap((s) => s.lectures.map((l) => ({ lecture: l, sectionTitle: s.title })));
  }, [course]);

  const completedIds = useMemo(
    () => new Set(progress?.lectures.filter((l) => l.completedAt).map((l) => l.lectureId) ?? []),
    [progress],
  );

  const currentLectureId = searchParams.get('lecture') || flatLectures[0]?.lecture.id;
  const currentIndex = flatLectures.findIndex((f) => f.lecture.id === currentLectureId);
  const current = flatLectures[currentIndex];

  // Redirect to the first not-yet-completed lecture on first load if no lecture is specified.
  useEffect(() => {
    if (!searchParams.get('lecture') && flatLectures.length > 0) {
      const next = flatLectures.find((f) => !completedIds.has(f.lecture.id)) ?? flatLectures[0];
      router.replace(`/learn/${params.slug}?lecture=${next.lecture.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatLectures.length]);

  const { data: notes } = useQuery({
    queryKey: current ? queryKeys.notes(current.lecture.id) : ['notes', 'pending'],
    queryFn: () => learningApi.listLectureNotes(current!.lecture.id),
    enabled: !!current,
  });
  const { data: questions } = useQuery({
    queryKey: course ? queryKeys.questions(course.id) : ['questions', 'pending'],
    queryFn: () => learningApi.listQuestions(course!.id),
    enabled: !!course,
  });

  const progressMutation = useMutation({
    mutationFn: (completed: boolean) =>
      learningApi.updateLectureProgress(current!.lecture.id, {
        positionSeconds: current!.lecture.durationSeconds,
        completed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courseProgress(course!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myLearning });
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates });
    },
    onError: (err) => toast.show(err instanceof ApiError ? err.message : 'Could not update progress.', 'error'),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) =>
      learningApi.createNote(current!.lecture.id, { timestampSeconds: 0, body }),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(current!.lecture.id) });
    },
    onError: (err) => toast.show(err instanceof ApiError ? err.message : 'Could not save note.', 'error'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => learningApi.deleteNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notes(current!.lecture.id) }),
  });

  const askMutation = useMutation({
    mutationFn: (body: string) => learningApi.askQuestion(course!.id, { body, lectureId: current?.lecture.id }),
    onSuccess: () => {
      setQuestionText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(course!.id) });
    },
    onError: (err) => toast.show(err instanceof ApiError ? err.message : 'Could not post question.', 'error'),
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string; body: string }) =>
      learningApi.answerQuestion(questionId, body),
    onSuccess: (_data, vars) => {
      setAnswerDrafts((prev) => ({ ...prev, [vars.questionId]: '' }));
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(course!.id) });
    },
  });

  if (courseLoading || !course || !progress || !current) return <PageSpinner />;

  if (myLearning && !enrolled) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center px-6">
        <p className="text-ink-600 mb-4">You need to enroll in this course to access the lessons.</p>
        <Link href={`/courses/${params.slug}`}>
          <Button>View course</Button>
        </Link>
      </div>
    );
  }

  const { lecture, sectionTitle } = current;
  const isDone = completedIds.has(lecture.id);
  const pct = progress.percent;
  const hasNext = currentIndex < flatLectures.length - 1;
  const hasPrev = currentIndex > 0;

  function goToLecture(id: string) {
    router.push(`/learn/${params.slug}?lecture=${id}`);
    setTab('overview');
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'notes', label: 'Notes' },
    { key: 'qa', label: 'Q&A' },
  ];

  return (
    <div className="animate-fadeUp flex-1 flex flex-col">
      <div className="bg-ink-900 text-white flex items-center gap-3.5 px-4 sm:px-7 py-2.5">
        <Link
          href={`/courses/${params.slug}`}
          className="flex items-center gap-1.5 bg-white/[0.08] rounded-[9px] px-3.5 py-2 text-[13.5px] font-semibold hover:bg-white/[0.16]"
        >
          <ChevronLeft size={15} />
          Course
        </Link>
        <div className="font-display font-bold text-[15px] flex-1 min-w-0 truncate">{course.title}</div>
        <div className="text-[13px] text-white/75 shrink-0">
          <strong className="text-white">{pct}%</strong> complete
        </div>
      </div>

      <div className="flex flex-wrap items-stretch flex-1">
        <div className="flex-1 basis-[600px] min-w-0 bg-white">
          <div className="aspect-video bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 relative flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.16), transparent 55%)' }}
            />
            <div className="relative text-center text-white px-6">
              <div className="w-[74px] h-[74px] rounded-full bg-white/95 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Play size={26} className="text-brand-700 fill-brand-700 ml-1" />
              </div>
              <div className="text-[13px] text-white/70 font-semibold tracking-wide">{sectionTitle}</div>
              <div className="font-display font-bold text-xl mt-1 max-w-[480px]">{lecture.title}</div>
            </div>
          </div>

          <div className="p-5 sm:p-7 border-b border-ink-200">
            <div className="flex flex-wrap gap-3.5 items-center justify-between">
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-brand-600 mb-1">
                  LECTURE {currentIndex + 1} · {sectionTitle}
                </div>
                <h1 className="font-display font-extrabold text-[clamp(20px,2.4vw,26px)] tracking-tight">
                  {lecture.title}
                </h1>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => goToLecture(flatLectures[currentIndex - 1].lecture.id)}
                >
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => goToLecture(flatLectures[currentIndex + 1].lecture.id)}
                >
                  Next <ChevronRight size={14} />
                </Button>
                <Button
                  size="sm"
                  loading={progressMutation.isPending}
                  onClick={() => progressMutation.mutate(!isDone)}
                  className={isDone ? '!bg-success-light !text-success-dark !shadow-none' : ''}
                >
                  <Check size={15} />
                  {isDone ? 'Completed' : 'Mark complete'}
                </Button>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-7 border-b border-ink-200 flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`bg-none border-none py-3.5 px-1 mr-6 font-display font-bold text-[15px] cursor-pointer border-b-[2.5px] ${
                  tab === t.key ? 'text-brand-600 border-brand-600' : 'text-ink-500 border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7 pb-10">
            {tab === 'overview' && (
              <>
                <h3 className="font-display font-extrabold text-[17px] mb-2.5">About this lecture</h3>
                <p className="text-[15px] leading-relaxed text-ink-600 mb-5 max-w-[680px]">
                  Follow along with the video, pause whenever you need to, and revisit it any time —
                  it&apos;s yours for life.
                </p>
                <div className="flex flex-wrap gap-3">
                  {lecture.transcriptUrl && (
                    <a
                      href={lecture.transcriptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 bg-ink-50 border border-ink-200 rounded-[11px] px-3.5 py-2.5 text-[13.5px] text-ink-700 hover:bg-ink-100"
                    >
                      <FileText size={15} /> Lecture transcript
                    </a>
                  )}
                  {lecture.resources.map((r) => (
                    <a
                      key={r.id}
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 bg-ink-50 border border-ink-200 rounded-[11px] px-3.5 py-2.5 text-[13.5px] text-ink-700 hover:bg-ink-100"
                    >
                      <Download size={15} /> {r.label}
                    </a>
                  ))}
                  {!lecture.transcriptUrl && lecture.resources.length === 0 && (
                    <div className="text-sm text-ink-400">No downloadable resources for this lecture.</div>
                  )}
                </div>
              </>
            )}

            {tab === 'notes' && (
              <div className="max-w-[680px]">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type a note about this lecture..."
                  rows={4}
                />
                <div className="flex justify-end my-2.5 mb-6">
                  <Button
                    size="sm"
                    loading={noteMutation.isPending}
                    disabled={!noteText.trim()}
                    onClick={() => noteMutation.mutate(noteText.trim())}
                  >
                    Save note
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  {notes?.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-ink-200 border-l-[3px] border-l-brand-600 rounded-[10px] p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-md">
                          {timestampLabel(note.timestampSeconds)}
                        </span>
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-xs text-ink-400 hover:text-danger-dark"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-ink-600 leading-relaxed">{note.body}</p>
                    </div>
                  ))}
                  {notes?.length === 0 && (
                    <div className="text-sm text-ink-400">No notes for this lecture yet.</div>
                  )}
                </div>
              </div>
            )}

            {tab === 'qa' && (
              <div className="max-w-[720px]">
                <div className="flex gap-2.5 mb-6">
                  <input
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Ask a question about this course..."
                    className="flex-1 border border-ink-200 rounded-[11px] px-3.5 py-3 text-[14.5px] outline-none focus:border-brand-600 focus:shadow-[0_0_0_3px_#EEF2FF]"
                  />
                  <Button
                    loading={askMutation.isPending}
                    disabled={questionText.trim().length < 5}
                    onClick={() => askMutation.mutate(questionText.trim())}
                  >
                    Ask
                  </Button>
                </div>
                <div className="flex flex-col">
                  {questions?.map((q) => (
                    <div key={q.id} className="border-b border-ink-100 py-4.5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-[13px] font-display"
                          style={{ background: avatarColorFor(q.userId) }}
                        >
                          {initialsOf(q.user.name)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-ink-800">{q.user.name}</div>
                          <div className="text-xs text-ink-400">{relativeTime(q.createdAt)}</div>
                        </div>
                      </div>
                      <div className="font-display font-bold text-[15px] text-ink-800 mb-2.5">{q.body}</div>
                      <div className="flex flex-col gap-2.5 mb-3">
                        {q.answers.map((a) => (
                          <div key={a.id} className="flex gap-2.5 bg-ink-50 rounded-[11px] p-3.5">
                            <div
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0"
                              style={{
                                background: a.isInstructorAnswer ? '#4338CA' : avatarColorFor(a.userId),
                              }}
                            >
                              {initialsOf(a.user.name)}
                            </div>
                            <div>
                              <div className="text-[12.5px] font-bold text-brand-700 mb-0.5">
                                {a.isInstructorAnswer ? 'Instructor' : a.user.name}
                              </div>
                              <p className="text-sm text-ink-600 leading-snug">{a.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={answerDrafts[q.id] ?? ''}
                          onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Write a reply..."
                          className="flex-1 border border-ink-200 rounded-[9px] px-3 py-2 text-sm outline-none focus:border-brand-600"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!(answerDrafts[q.id] ?? '').trim()}
                          loading={answerMutation.isPending && answerMutation.variables?.questionId === q.id}
                          onClick={() =>
                            answerMutation.mutate({ questionId: q.id, body: (answerDrafts[q.id] ?? '').trim() })
                          }
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                  {questions?.length === 0 && (
                    <div className="text-sm text-ink-400">No questions yet — be the first to ask.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="flex-1 basis-[340px] max-w-full lg:max-w-[400px] border-t lg:border-t-0 lg:border-l border-ink-200 bg-white">
          <div className="p-4.5 border-b border-ink-200 sticky top-0 bg-white z-[2]">
            <div className="font-display font-extrabold text-base mb-2.5">Course content</div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2 bg-brand-50 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[12.5px] font-bold text-brand-600 shrink-0">
                {progress.completedCount}/{progress.totalLectures}
              </span>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {course.sections.map((sec) => (
              <div key={sec.id}>
                <div className="px-4 pt-3.5 pb-2.5 bg-ink-50 border-b border-ink-100">
                  <div className="font-display font-bold text-[13.5px] text-ink-800">{sec.title}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{sec.lectures.length} lectures</div>
                </div>
                {sec.lectures.map((lec) => {
                  const done = completedIds.has(lec.id);
                  const active = lec.id === lecture.id;
                  return (
                    <button
                      key={lec.id}
                      onClick={() => goToLecture(lec.id)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 border-l-[3px] text-left ${
                        active ? 'border-brand-600 bg-brand-50' : 'border-transparent hover:bg-ink-50'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-[1.6px] ${
                          done ? 'bg-success border-success' : 'border-ink-300'
                        }`}
                      >
                        {done && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span
                        className={`flex-1 text-[13.5px] leading-snug ${
                          active ? 'text-brand-700 font-bold' : 'text-ink-700 font-medium'
                        }`}
                      >
                        {lec.title}
                      </span>
                      <span className="text-xs text-ink-400 shrink-0">{durationLabel(lec.durationSeconds)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PlayerContent />
    </Suspense>
  );
}
