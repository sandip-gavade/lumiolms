export type MembershipRole = 'STUDENT' | 'INSTRUCTOR' | 'ORG_ADMIN';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type CourseStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
export type DiscountType = 'PERCENT' | 'FIXED';
export type NotificationType =
  | 'QA_REPLY'
  | 'COURSE_ANNOUNCEMENT'
  | 'SALE'
  | 'RESUME_REMINDER'
  | 'CERTIFICATE_READY';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenantId: string;
  roles: MembershipRole[];
}

export interface PersonRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug?: string;
}

export interface Category {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  createdAt: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  level: CourseLevel;
  priceCents: number;
  currency: string;
  thumbnailUrl: string | null;
  status: CourseStatus;
  category: CategoryRef | null;
  instructor: PersonRef;
  ratingAvg: number;
  ratingCount: number;
}

export interface CourseListResponse {
  items: CourseListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface LectureResource {
  id: string;
  lectureId: string;
  label: string;
  fileUrl: string;
  type: 'SOURCE_CODE' | 'EXERCISE_FILE' | 'ATTACHMENT';
}

export interface Lecture {
  id: string;
  sectionId: string;
  title: string;
  position: number;
  durationSeconds: number;
  videoAssetId: string | null;
  transcriptUrl: string | null;
  isPreview: boolean;
  createdAt: string;
  resources: LectureResource[];
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  position: number;
  createdAt: string;
  lectures: Lecture[];
}

export interface CourseDetail {
  id: string;
  tenantId: string;
  instructorId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  shortDesc: string;
  longDesc: string;
  outcomes: string[];
  level: CourseLevel;
  priceCents: number;
  currency: string;
  thumbnailUrl: string | null;
  status: CourseStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: { id: string; name: string; avatarUrl: string | null };
  category: { id: string; name: string; slug: string } | null;
  sections: CourseSection[];
  ratingAvg: number;
  ratingCount: number;
}

export interface Review {
  id: string;
  tenantId: string;
  courseId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  user: PersonRef;
}

export interface ReviewsResponse {
  reviews: Review[];
  ratingAvg: number;
  ratingCount: number;
  histogram: Record<string, number>;
}

export interface CartItemCourse {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  thumbnailUrl: string | null;
  status: CourseStatus;
}

export interface CartItem {
  id: string;
  cartId: string;
  courseId: string;
  addedAt: string;
  course: CartItemCourse;
}

export interface CartResponse {
  items: CartItem[];
  subtotalCents: number;
}

export interface CheckoutResult {
  orderId: string;
  status: 'PENDING' | 'PAID';
  checkoutUrl: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  courseId: string;
  priceCents: number;
  createdAt: string;
  course: { id: string; title: string; slug: string; thumbnailUrl: string | null };
  refunds?: Refund[];
}

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  couponId: string | null;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  coupon?: { code: string; discountType: DiscountType; discountValue: number } | null;
}

export interface Refund {
  id: string;
  orderId: string;
  orderItemId: string | null;
  amountCents: number;
  reason: string | null;
  status: RefundStatus;
  requestedByUserId: string;
  processedByUserId: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface MyLearningCourseEntry {
  course: { id: string; title: string; slug: string; thumbnailUrl: string | null };
  enrolledAt: string;
  totalLectures: number;
  completedCount: number;
  percent: number;
  status: 'in_progress' | 'completed';
}

export type ActivityEvent =
  | {
      type: 'lecture_completed';
      at: string;
      courseTitle: string;
      courseSlug: string;
      lectureTitle: string;
    }
  | { type: 'enrolled'; at: string; courseTitle: string; courseSlug: string };

export interface RecommendedCourse {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  priceCents: number;
  currency: string;
}

export interface MyLearningResponse {
  courses: MyLearningCourseEntry[];
  inProgressCount: number;
  completedCount: number;
  streakDays: number;
  recentActivity: ActivityEvent[];
  recommended: RecommendedCourse[];
}

export interface CourseProgress {
  totalLectures: number;
  completedCount: number;
  percent: number;
  lectures: { lectureId: string; positionSeconds: number; completedAt: string | null }[];
}

export interface Note {
  id: string;
  tenantId: string;
  userId: string;
  lectureId: string;
  timestampSeconds: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  isInstructorAnswer: boolean;
  createdAt: string;
  user: PersonRef;
}

export interface Question {
  id: string;
  tenantId: string;
  courseId: string;
  lectureId: string | null;
  userId: string;
  body: string;
  createdAt: string;
  user: PersonRef;
  answers: Answer[];
}

export interface Certificate {
  id: string;
  tenantId: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  pdfUrl: string;
  issuedAt: string;
  course?: { id: string; title: string; slug: string };
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
