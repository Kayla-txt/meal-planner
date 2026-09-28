import { supabase } from "./supabase";

const apiUrl = "http://127.0.0.1:3000/api";

async function authenticatedRequest(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Please sign in before changing your meals.");

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "The meal request could not be completed.");
  }

  return response.status === 204 ? null : response.json();
}

export function getMeals() {
  return authenticatedRequest("/meals");
}

export function addMeal(meal) {
  return authenticatedRequest("/meals", {
    method: "POST",
    body: JSON.stringify(meal),
  });
}

export function updateMeal(id, updates) {
  return authenticatedRequest(`/meals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteMeal(id) {
  return authenticatedRequest(`/meals/${id}`, { method: "DELETE" });
}

export function deleteAccount() {
  return authenticatedRequest("/account", { method: "DELETE" });
}

export function getDailyMeals(date) {
  return authenticatedRequest(`/daily-meals?date=${encodeURIComponent(date)}`);
}

export function getMealHistory(startDate, endDate) {
  return authenticatedRequest(`/daily-meals/history?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
}

export function updateDailyMeals(date, updates) {
  return authenticatedRequest(`/daily-meals/${encodeURIComponent(date)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function getShoppingItems() {
  return authenticatedRequest("/shopping-items");
}

export function addShoppingItem(itemName) {
  return authenticatedRequest("/shopping-items", { method: "POST", body: JSON.stringify({ item_name: itemName }) });
}

export function updateShoppingItem(id, isChecked) {
  return authenticatedRequest(`/shopping-items/${id}`, { method: "PATCH", body: JSON.stringify({ is_checked: isChecked }) });
}

export function deleteShoppingItem(id) {
  return authenticatedRequest(`/shopping-items/${id}`, { method: "DELETE" });
}

export function emailShoppingList(screenshot) {
  return authenticatedRequest("/shopping-list/email", { method: "POST", body: JSON.stringify({ screenshot }) });
}
