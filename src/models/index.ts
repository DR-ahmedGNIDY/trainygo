/**
 * Barrel export for all Mongoose models. Importing from here guarantees every
 * model is registered before any populate() call, regardless of import order.
 */
export { User, default as UserModel } from "./User";
export { Plan } from "./Plan";
export { Subscription } from "./Subscription";
export { Exercise } from "./Exercise";
export { Food } from "./Food";
export { WorkoutTemplate } from "./WorkoutTemplate";
export { ClientProgram } from "./ClientProgram";
export { NutritionTemplate } from "./NutritionTemplate";
export { NutritionPlan } from "./NutritionPlan";
export { WorkoutLog } from "./WorkoutLog";
export { ProgressEntry } from "./ProgressEntry";
export { CheckinForm, CheckinResponse } from "./Checkin";
export { Conversation, Message } from "./Message";
export { Notification } from "./Notification";
export { ClientRequest } from "./ClientRequest";
export { Settings } from "./Settings";
export { Counter } from "./Counter";
export { SubscriptionFreezeHistory } from "./SubscriptionFreezeHistory";

export type { IUser, ICoachProfile, IClientProfile, IMedia } from "./User";
export type { IPlan } from "./Plan";
export type { ISubscription } from "./Subscription";
export type { IExercise } from "./Exercise";
export type { IFood } from "./Food";
export type {
  IWorkoutTemplate,
  IWorkoutWeek,
  IWorkoutDay,
  IWorkoutExerciseEntry,
} from "./WorkoutTemplate";
export type { IClientProgram } from "./ClientProgram";
export type {
  INutritionTemplate,
  IMeal,
  INutritionItem,
} from "./NutritionTemplate";
export type { INutritionPlan } from "./NutritionPlan";
export type { IWorkoutLog, ILoggedSet } from "./WorkoutLog";
export type { IProgressEntry } from "./ProgressEntry";
export type { ICheckinForm, ICheckinResponse, ICheckinField } from "./Checkin";
export type { IConversation, IMessage } from "./Message";
export type { INotification } from "./Notification";
export type { IClientRequest, IExerciseChangePayload } from "./ClientRequest";
export type { ISettings } from "./Settings";
export type { ICounter } from "./Counter";
export type { ISubscriptionFreezeHistory } from "./SubscriptionFreezeHistory";
