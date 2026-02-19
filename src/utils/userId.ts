/** 브라우저별 고유 사용자 ID (localStorage) */
export function getUserId(): string {
  let userId = localStorage.getItem("deary_user_id");
  if (!userId) {
    userId =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `user_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`);
    localStorage.setItem("deary_user_id", userId);
  }
  return userId;
}
