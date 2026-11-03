import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import html2canvas from "html2canvas";
import { CardSpotlight } from "./components/ui/card-spotlight";
import Carousel from "./components/ui/carousel";
import { BotanicalBackground } from "./components/ui/botanical-background";
import { addShoppingItem, deleteAccount, deleteShoppingItem, emailShoppingList, getDailyMeals, getMealHistory, getShoppingItems, updateDailyMeals, updateShoppingItem } from "./lib/meal-api";
import { supabase } from "./lib/supabase";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

const actions = [
  { title: "Meal history", description: "Look back at meals you have saved." },
  { title: "Today’s meals", description: "Add or update breakfast, lunch, dinner, and snacks." },
  { title: "Plan ahead", description: "Make a simple plan for upcoming days." },
  { title: "Shopping list", description: "Keep track of ingredients you need to buy." },
];

const meals = [
  { field: "breakfast", tagField: "breakfast_tag", name: "Breakfast", note: "Start gently" },
  { field: "lunch", tagField: "lunch_tag", name: "Lunch", note: "Midday fuel" },
  { field: "dinner", tagField: "dinner_tag", name: "Dinner", note: "Wind down warmly" },
  { field: "snack", tagField: "snack_tag", name: "Snack", note: "A little boost" },
];

const mealTags = [
  { value: "green", label: "Green", color: "#4B9B6B" },
  { value: "yellow", label: "Yellow", color: "#E2B93B" },
  { value: "orange", label: "Orange", color: "#D87938" },
  { value: "red", label: "Red", color: "#B94747" },
];

const historyOffsets = Array.from({ length: 365 }, (_, index) => 365 - index);
const lastWeekOffsets = [7, 6, 5, 4, 3, 2, 1];
const futureOffsets = Array.from({ length: 365 }, (_, index) => index + 1);
const nextWeekOffsets = [1, 2, 3, 4, 5, 6, 7];
const tagHealthScores = { green: 100, yellow: 67, orange: 34, red: 0 };

function localDateKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateKeyOffset(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyMealPlan(mealDate) {
  return { meal_date: mealDate, breakfast: "", lunch: "", dinner: "", snack: "", breakfast_tag: null, lunch_tag: null, dinner_tag: null, snack_tag: null };
}

function shortDateLabel(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
}

function TodayPage({ onBack }) {
  const [mealDate] = useState(localDateKey);
  const [mealEntries, setMealEntries] = useState({ breakfast: "", lunch: "", dinner: "", snack: "", breakfast_tag: null, lunch_tag: null, dinner_tag: null, snack_tag: null });

  useEffect(() => {
    let active = true;
    getDailyMeals(mealDate)
      .then(({ plan }) => {
        if (!active) return;
        setMealEntries({ breakfast: plan.breakfast, lunch: plan.lunch, dinner: plan.dinner, snack: plan.snack, breakfast_tag: plan.breakfast_tag, lunch_tag: plan.lunch_tag, dinner_tag: plan.dinner_tag, snack_tag: plan.snack_tag });
      })
      .catch((error) => active && console.error("Could not load today’s meals:", error));

    return () => { active = false; };
  }, [mealDate]);

  async function saveMeal(field, value = mealEntries[field]) {
    try {
      await updateDailyMeals(mealDate, { [field]: value });
    } catch (error) {
      console.error("Could not save today’s meal:", error);
    }
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12 sm:px-10">
      <button className="mb-10 text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <p className="mb-2 text-sm font-medium text-[#1E4D3A]">TODAY</p>
      <h1 className="text-4xl font-semibold tracking-tight text-[#1E4D3A] sm:text-5xl">Today’s meals</h1>
      <p className="mt-4 max-w-xl text-[#1E4D3A]">Choose a meal to add or edit what you ate today.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {meals.map((meal) => (
          <div className="min-h-64 rounded-md bg-[#DCEFE0] p-6" key={meal.name}>
            <label className="relative z-10 flex h-full w-full flex-col text-left">
              <span className="text-2xl font-semibold text-[#2F7A57]">{meal.name}</span>
              <span className="mt-2 block text-sm text-[#1E4D3A]">{meal.note}</span>
              <textarea aria-label={`${meal.name} meal`} className="mt-4 min-h-28 w-full resize-none bg-[#DCEFE0] p-3 text-black outline-none placeholder:text-[#1E4D3A] focus:outline-none focus:ring-0" onBlur={() => saveMeal(meal.field)} onChange={(event) => setMealEntries((entries) => ({ ...entries, [meal.field]: event.target.value }))} placeholder="What did you have?" value={mealEntries[meal.field]} />
              <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label={`${meal.name} meal tag`}>
                {mealTags.map((tag) => {
                  const selected = mealEntries[meal.tagField] === tag.value;
                  return <button aria-label={tag.label} title={tag.label} aria-pressed={selected} className="h-7 w-full rounded-full border px-1 py-1 text-xs font-medium" key={tag.value} onClick={() => { const nextTag = selected ? null : tag.value; setMealEntries((entries) => ({ ...entries, [meal.tagField]: nextTag })); saveMeal(meal.tagField, nextTag); }} style={{ backgroundColor: selected ? tag.color : "transparent", borderColor: tag.color, color: selected ? "#F8FCF7" : "#1E4D3A" }} type="button"></button>;
                })}
              </div>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryPage({ onBack }) {
  const [plans, setPlans] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [cellDraft, setCellDraft] = useState(null);
  const [message, setMessage] = useState("Loading meal history…");
  const [visibleOffsets, setVisibleOffsets] = useState([7, 6, 5, 4, 3, 2, 1]);

  const lastWeekTagScores = lastWeekOffsets.flatMap((dayOffset) => {
    const plan = plans[dateKeyOffset(dayOffset)];
    return meals.map((meal) => tagHealthScores[plan?.[meal.tagField]]).filter((score) => score !== undefined);
  });
  const healthinessIndex = lastWeekTagScores.length
    ? Math.round(lastWeekTagScores.reduce((total, score) => total + score, 0) / lastWeekTagScores.length)
    : null;
  const healthinessColor = healthinessIndex === null
    ? "#1E4D3A"
    : healthinessIndex >= 75
      ? "#4B9B6B"
      : healthinessIndex >= 50
        ? "#E2B93B"
        : healthinessIndex >= 25
          ? "#D87938"
          : "#B94747";

  useEffect(() => {
    let active = true;
    const visibleDays = visibleOffsets.map(dateKeyOffset);
    getMealHistory(visibleDays[0], visibleDays[visibleDays.length - 1])
      .then(({ plans: historyPlans }) => {
        if (!active) return;
        setPlans((currentPlans) => ({ ...currentPlans, ...Object.fromEntries(historyPlans.map((plan) => [plan.meal_date, plan])) }));
        setMessage("");
    })
      .catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [visibleOffsets]);

  function startEditing(date, meal) {
    const existingPlan = plans[date] ?? emptyMealPlan(date);
    setCellDraft({ value: existingPlan[meal.field], tag: existingPlan[meal.tagField] });
    setEditingCell({ date, field: meal.field, tagField: meal.tagField });
    setMessage("");
  }

  async function saveActiveCell() {
    if (!editingCell || !cellDraft) return;
    const activeCell = editingCell;
    const activeDraft = cellDraft;
    setEditingCell(null);
    setCellDraft(null);
    const existingPlan = plans[activeCell.date];
    if (!existingPlan && !activeDraft.value.trim() && !activeDraft.tag) return;

    try {
      const { plan } = await updateDailyMeals(activeCell.date, {
        [activeCell.field]: activeDraft.value,
        [activeCell.tagField]: activeDraft.tag,
      });
      setPlans((currentPlans) => ({ ...currentPlans, [plan.meal_date]: plan }));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function renderHistoryCard(dayOffset, isVisible, isRendered) {
    if (!isRendered) return <div className="min-h-96" />;
    const date = dateKeyOffset(dayOffset);
    const plan = plans[date] ?? emptyMealPlan(date);
    return (
            <article className="min-h-96 rounded-md bg-[#DCEFE0] p-4">
              <div className="border-b border-[#2F7A57] pb-4 text-center">
                <h2 className="text-sm font-semibold text-[#1E4D3A]">{shortDateLabel(date)}</h2>
              </div>
              <dl>
                {meals.map((meal) => {
                  const tag = mealTags.find((item) => item.value === plan[meal.tagField]);
                  const isEditing = editingCell?.date === date && editingCell?.field === meal.field;
                  return (
                    <div className="border-b border-[#2F7A57] py-4 last:border-b-0" key={meal.field}>
                      <dt><button className="text-sm font-semibold text-[#2F7A57]" onClick={() => startEditing(date, meal)} type="button">{meal.name}</button></dt>
                      {isEditing ? (
                        <dd className="mt-2">
                          <textarea autoFocus className="min-h-20 w-full resize-none rounded-md bg-transparent p-2 text-sm text-[#1E4D3A] outline-none placeholder:text-[#2F7A57]" onBlur={saveActiveCell} onChange={(event) => setCellDraft((currentDraft) => ({ ...currentDraft, value: event.target.value }))} placeholder="What did you have?" value={cellDraft.value} />
                          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`${meal.name} meal tag`}>
                            {mealTags.map((colorTag) => {
                              const selected = cellDraft.tag === colorTag.value;
                              return <button aria-label={colorTag.label} title={colorTag.label} aria-pressed={selected} className="h-5 w-5 shrink-0 rounded-full border p-0" key={colorTag.value} onClick={() => setCellDraft((currentDraft) => ({ ...currentDraft, tag: selected ? null : colorTag.value }))} onMouseDown={(event) => event.preventDefault()} style={{ backgroundColor: selected ? colorTag.color : "transparent", borderColor: colorTag.color, color: selected ? "#F8FCF7" : "#1E4D3A" }} type="button"></button>;
                            })}
                          </div>
                        </dd>
                      ) : (
                        <dd><button className="mt-1 min-h-5 w-full break-words text-left text-sm text-[#1E4D3A]" onClick={() => startEditing(date, meal)} type="button">{tag && <span aria-label={`${tag.label} tag`} className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />}{plan[meal.field] || " "}</button></dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            </article>
    );
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 sm:px-10">
      <button className="mb-10 text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-[#2F7A57]">MEAL HISTORY</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1E4D3A] sm:text-5xl">Your past seven days</h1>
        </div>
        <aside className="mt-6 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-[#2F7A57]">Healthiness index</p>
          <p className="mt-0.5 text-2xl font-semibold" style={{ color: healthinessColor }}>
            <span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: healthinessColor }} />
            {healthinessIndex === null ? "—" : `${healthinessIndex}%`}
          </p>
        </aside>
      </div>
      <p className="mt-4 max-w-xl text-[#2F7A57]">Review what you recorded each day. Days without meal data are left blank.</p>

      <div className="mt-10">
        <Carousel onSlideChange={setVisibleOffsets} renderSlide={renderHistoryCard} slides={historyOffsets} />
      </div>

      {message && <p className="mt-4 text-sm text-[#1E4D3A]">{message}</p>}
    </section>
  );
}

function PlanAheadPage({ onBack }) {
  const [plans, setPlans] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [cellDraft, setCellDraft] = useState(null);
  const [message, setMessage] = useState("Loading your meal plans…");
  const [visibleOffsets, setVisibleOffsets] = useState(nextWeekOffsets);

  const nextWeekTagScores = nextWeekOffsets.flatMap((dayOffset) => {
    const plan = plans[dateKeyOffset(-dayOffset)];
    return meals.map((meal) => tagHealthScores[plan?.[meal.tagField]]).filter((score) => score !== undefined);
  });
  const healthinessIndex = nextWeekTagScores.length
    ? Math.round(nextWeekTagScores.reduce((total, score) => total + score, 0) / nextWeekTagScores.length)
    : null;
  const healthinessColor = healthinessIndex === null ? "#1E4D3A" : healthinessIndex >= 75 ? "#4B9B6B" : healthinessIndex >= 50 ? "#E2B93B" : healthinessIndex >= 25 ? "#D87938" : "#B94747";

  useEffect(() => {
    let active = true;
    const visibleDays = visibleOffsets.map((dayOffset) => dateKeyOffset(-dayOffset));
    getMealHistory(visibleDays[0], visibleDays[visibleDays.length - 1])
      .then(({ plans: plannedMeals }) => {
        if (!active) return;
        setPlans((currentPlans) => ({ ...currentPlans, ...Object.fromEntries(plannedMeals.map((plan) => [plan.meal_date, plan])) }));
        setMessage("");
      })
      .catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [visibleOffsets]);

  function startEditing(date, meal) {
    const existingPlan = plans[date] ?? emptyMealPlan(date);
    setCellDraft({ value: existingPlan[meal.field], tag: existingPlan[meal.tagField] });
    setEditingCell({ date, field: meal.field, tagField: meal.tagField });
    setMessage("");
  }

  async function saveActiveCell() {
    if (!editingCell || !cellDraft) return;
    const activeCell = editingCell;
    const activeDraft = cellDraft;
    setEditingCell(null);
    setCellDraft(null);
    if (!plans[activeCell.date] && !activeDraft.value.trim() && !activeDraft.tag) return;
    try {
      const { plan } = await updateDailyMeals(activeCell.date, { [activeCell.field]: activeDraft.value, [activeCell.tagField]: activeDraft.tag });
      setPlans((currentPlans) => ({ ...currentPlans, [plan.meal_date]: plan }));
    } catch (error) {
      setMessage(error.message);
    }
  }

  function renderPlanCard(dayOffset, isVisible, isRendered) {
    if (!isRendered) return <div className="min-h-96" />;
    const date = dateKeyOffset(-dayOffset);
    const plan = plans[date] ?? emptyMealPlan(date);
    return (
      <article className="min-h-96 rounded-md bg-[#DCEFE0] p-4">
        <div className="border-b border-[#2F7A57] pb-4 text-center"><h2 className="text-sm font-semibold text-[#1E4D3A]">{shortDateLabel(date)}</h2></div>
        <dl>{meals.map((meal) => {
          const tag = mealTags.find((item) => item.value === plan[meal.tagField]);
          const isEditing = editingCell?.date === date && editingCell?.field === meal.field;
          return <div className="border-b border-[#2F7A57] py-4 last:border-b-0" key={meal.field}>
            <dt><button className="text-sm font-semibold text-[#2F7A57]" onClick={() => startEditing(date, meal)} type="button">{meal.name}</button></dt>
            {isEditing ? <dd className="mt-2"><textarea autoFocus className="min-h-20 w-full resize-none rounded-md bg-transparent p-2 text-sm text-[#1E4D3A] outline-none placeholder:text-[#2F7A57]" onBlur={saveActiveCell} onChange={(event) => setCellDraft((draft) => ({ ...draft, value: event.target.value }))} placeholder="What are you planning?" value={cellDraft.value} /><div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`${meal.name} meal tag`}>{mealTags.map((colorTag) => { const selected = cellDraft.tag === colorTag.value; return <button aria-label={colorTag.label} title={colorTag.label} aria-pressed={selected} className="h-5 w-5 shrink-0 rounded-full border p-0" key={colorTag.value} onClick={() => setCellDraft((draft) => ({ ...draft, tag: selected ? null : colorTag.value }))} onMouseDown={(event) => event.preventDefault()} style={{ backgroundColor: selected ? colorTag.color : "transparent", borderColor: colorTag.color, color: selected ? "#F8FCF7" : "#1E4D3A" }} type="button"></button>; })}</div></dd> : <dd><button className="mt-1 min-h-5 w-full break-words text-left text-sm text-[#1E4D3A]" onClick={() => startEditing(date, meal)} type="button">{tag && <span aria-label={`${tag.label} tag`} className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />}{plan[meal.field] || " "}</button></dd>}
          </div>;
        })}</dl>
      </article>
    );
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 sm:px-10">
      <button className="mb-10 text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="mb-2 text-sm font-medium text-[#2F7A57]">PLAN AHEAD</p><h1 className="text-4xl font-semibold tracking-tight text-[#1E4D3A] sm:text-5xl">Your next seven days</h1></div><aside className="mt-6 text-right"><p className="text-xs font-medium uppercase tracking-wide text-[#2F7A57]">Healthiness index</p><p className="mt-0.5 text-2xl font-semibold" style={{ color: healthinessColor }}><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: healthinessColor }} />{healthinessIndex === null ? "—" : `${healthinessIndex}%`}</p></aside></div>
      <p className="mt-4 max-w-xl text-[#2F7A57]">Plan meals for the days ahead. Dates without plans are left blank.</p>
      <div className="mt-10"><Carousel initialPosition="start" onSlideChange={setVisibleOffsets} renderSlide={renderPlanCard} slides={futureOffsets} /></div>
      {message && <p className="mt-4 text-sm text-[#1E4D3A]">{message}</p>}
    </section>
  );
}

function ShoppingListPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [message, setMessage] = useState("Loading your shopping list…");
  const [isEmailing, setIsEmailing] = useState(false);
  const listRef = useRef(null);
  const pendingItems = useRef(new Set());
  const reduceMotion = useReducedMotion();
  const visibleItems = items.filter((item) => !item.is_checked);

  useEffect(() => {
    let active = true;
    getShoppingItems()
      .then(({ items: shoppingItems }) => {
        if (!active) return;
        setItems(shoppingItems);
        setMessage("");
      })
      .catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, []);

  async function addItem(event) {
    event.preventDefault();
    const itemName = newItem.trim();
    if (!itemName) return;
    try {
      const { item } = await addShoppingItem(itemName);
      setItems((currentItems) => [item, ...currentItems]);
      setNewItem("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleItem(item) {
    if (pendingItems.current.has(item.id)) return;
    pendingItems.current.add(item.id);
    setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id ? { ...currentItem, is_checked: true } : currentItem));
    try {
      const { item: updatedItem } = await updateShoppingItem(item.id, true);
      setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === updatedItem.id ? updatedItem : currentItem));
    } catch (error) {
      setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id ? item : currentItem));
      setMessage(error.message);
    } finally {
      pendingItems.current.delete(item.id);
    }
  }

  async function removeItem(id) {
    try {
      await deleteShoppingItem(id);
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function emailList() {
    if (!listRef.current || visibleItems.length === 0) return;
    setIsEmailing(true);
    setMessage("Creating your list screenshot…");
    try {
      const canvas = await html2canvas(listRef.current, { backgroundColor: "#F8FCF7", scale: 2 });
      const screenshot = canvas.toDataURL("image/png").split(",")[1];
      await emailShoppingList(screenshot);
      setMessage("Your shopping list has been emailed to your account address.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsEmailing(false);
    }
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
      <button className="mb-10 text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <p className="mb-2 text-sm font-medium text-[#2F7A57]">SHOPPING LIST</p>
      <h1 className="text-4xl font-semibold tracking-tight text-[#1E4D3A] sm:text-5xl">What do you need?</h1>
      <p className="mt-4 max-w-xl text-[#2F7A57]">Keep your ingredients together and check them off as you shop.</p>
      <form className="mt-8 flex gap-3" onSubmit={addItem}>
        <Input className="!bg-white !text-[#1E4D3A] placeholder:!text-[#2F7A57]" onChange={(event) => setNewItem(event.target.value)} placeholder="Add an ingredient" value={newItem} />
        <button className="shrink-0 rounded-md bg-[#2F7A57] px-4 py-2 text-sm font-medium text-[#F8FCF7]" type="submit">Add item</button>
      </form>
      <div className="mt-8" ref={listRef}>
        <AnimatePresence initial={false}>
        {visibleItems.map((item) => (
          <motion.div key={item.id} initial={false} animate={{ scaleX: 1, opacity: 1 }} exit={{ scaleX: reduceMotion ? 1 : 0, opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeIn" }} style={{ transformOrigin: "center", marginBottom: 12, overflow: "hidden" }}>
          <div className="flex items-center gap-3 rounded-md border border-[#2F7A57] bg-[#DCEFE0] p-4" key={item.id}>
            <input aria-label={`Mark ${item.item_name} as purchased`} checked={item.is_checked} className="h-4 w-4 accent-[#2F7A57]" onChange={() => toggleItem(item)} type="checkbox" />
            <span className={`flex-1 text-[#1E4D3A] ${item.is_checked ? "line-through opacity-60" : ""}`}>{item.item_name}</span>
            <button className="text-sm font-medium text-[#2F7A57] underline underline-offset-2" onClick={() => removeItem(item.id)} type="button">Remove</button>
          </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {!message && visibleItems.length === 0 && <p className="text-[#1E4D3A]">Your list is empty.</p>}
      </div>
      <button className="mt-6 rounded-md border border-[#2F7A57] bg-[#F8FCF7] px-4 py-2 text-sm font-medium text-[#2F7A57] disabled:cursor-not-allowed disabled:opacity-50" disabled={isEmailing || visibleItems.length === 0} onClick={emailList} type="button">{isEmailing ? "Emailing…" : "Email my list"}</button>
      {message && <p className="mt-4 text-sm text-[#1E4D3A]">{message}</p>}
    </section>
  );
}

function ProfileButton({ onProfile }) {
  return (
    <div className="absolute right-6 top-6 z-20 sm:right-10 sm:top-8">
      <button className="rounded-md border border-[#2F7A57] bg-[#DCEFE0] px-4 py-2 text-sm font-medium text-[#2F7A57]" onClick={onProfile} type="button">Profile</button>
    </div>
  );
}

function ProfilePage({ onBack, onLogin, onDeleted }) {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setDisplayName(data.user?.user_metadata?.display_name ?? "");
    });
    return () => { active = false; };
  }, []);

  async function saveDisplayName(event) {
    event.preventDefault();
    setIsSaving(true);
    const name = displayName.trim();
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (!error && data.user) {
      const { error: profileError } = await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
      if (profileError) {
        setMessage(profileError.message);
        setIsSaving(false);
        return;
      }
    }
    setIsSaving(false);
    setMessage(error ? error.message : "Display name saved.");
  }

  async function changePassword(event) {
    event.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);
    if (!error) setNewPassword("");
    setMessage(error ? error.message : "Password updated.");
  }

  async function removeAccount() {
    if (!window.confirm("Delete your account and all of its meal data? This cannot be undone.")) return;
    setIsSaving(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      onDeleted();
    } catch (error) {
      setMessage(error.message);
      setIsSaving(false);
    }
  }

  if (user === null) {
    return (
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <button className="mb-8 w-fit text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
        <div className="rounded-md border border-[#2F7A57] bg-[#DCEFE0] p-8">
          <h1 className="text-3xl font-semibold text-[#F8FCF7]">Profile</h1>
          <p className="mt-3 text-sm leading-6 text-[#1E4D3A]">Log in or create an account to manage your profile and save meals.</p>
          <button className="mt-6 w-full rounded-md bg-[#2F7A57] px-3 py-2 text-sm font-medium text-[#F8FCF7]" onClick={onLogin} type="button">Log in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <button className="mb-8 w-fit text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <div className="rounded-md border border-[#2F7A57] bg-[#DCEFE0] p-8">
        <p className="text-sm font-medium text-[#2F7A57]">PROFILE</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F8FCF7]">Your account</h1>
        <p className="mt-3 text-sm text-[#1E4D3A]">{user.email}</p>

        <form className="mt-6" onSubmit={saveDisplayName}>
          <Label className="text-[#1E4D3A]" htmlFor="display-name">Display name</Label>
          <div className="mt-2"><Input autoComplete="name" className="!bg-white !text-[#1E4D3A] placeholder:!text-[#2F7A57]" id="display-name" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should we address you?" type="text" value={displayName} /></div>
          <button className="mt-3 rounded-md bg-[#2F7A57] px-3 py-2 text-sm font-medium text-[#F8FCF7] disabled:opacity-70" disabled={isSaving} type="submit">Save display name</button>
        </form>

        <form className="mt-6 border-t border-[#2F7A57] pt-6" onSubmit={changePassword}>
          <Label className="text-[#1E4D3A]" htmlFor="new-password">New password</Label>
          <div className="mt-2"><Input autoComplete="new-password" className="!bg-white !text-[#1E4D3A] placeholder:!text-[#2F7A57]" id="new-password" minLength={6} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 6 characters" required type="password" value={newPassword} /></div>
          <button className="mt-3 rounded-md bg-[#2F7A57] px-3 py-2 text-sm font-medium text-[#F8FCF7] disabled:opacity-70" disabled={isSaving} type="submit">Change password</button>
        </form>

        <div className="mt-6 border-t border-[#2F7A57] pt-6">
          <button className="text-sm font-medium text-[#1E4D3A] underline underline-offset-2" onClick={() => supabase.auth.signOut().then(onBack)} type="button">Log out</button>
          <button className="ml-5 text-sm font-medium text-[#2F7A57] underline underline-offset-2" disabled={isSaving} onClick={removeAccount} type="button">Delete account</button>
        </div>
        {message && <p className="mt-4 text-sm text-[#1E4D3A]">{message}</p>}
      </div>
    </section>
  );
}

function LoginPage({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCredentials(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(mode === "login" ? "Signing in…" : "Creating your account…");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setIsSubmitting(false);
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        onSuccess();
      } else {
        setMessage("Check your email to confirm your account, then return here to log in.");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onSuccess();
  }

  return (
    <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <button className="mb-8 w-fit text-sm text-[#1E4D3A] hover:text-[#2F7A57]" onClick={onBack} type="button">← Back to overview</button>
      <div className="rounded-md border border-[#2F7A57] bg-[#DCEFE0] p-8">
        <p className="text-sm font-medium text-[#2F7A57]">MEAL PLANNER</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#F8FCF7]">{mode === "login" ? "Log in" : "Create an account"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#1E4D3A]">
          {mode === "login" ? "Enter your email and password to continue." : "Use your email and a password to create an account."}
        </p>
        <form className="mt-6" onSubmit={submitCredentials}>
          <Label className="text-[#1E4D3A]" htmlFor="login-email">Email</Label>
          <div className="mt-2"><Input autoComplete="email" className="!bg-white !text-[#1E4D3A] placeholder:!text-[#2F7A57]" id="login-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></div>
          <div className="mt-4">
            <Label className="text-[#1E4D3A]" htmlFor="login-password">Password</Label>
            <div className="mt-2"><Input autoComplete={mode === "login" ? "current-password" : "new-password"} className="!bg-white !text-[#1E4D3A] placeholder:!text-[#2F7A57]" id="login-password" minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required type="password" value={password} /></div>
          </div>
          <button className="mt-4 w-full rounded-md bg-[#2F7A57] px-3 py-2 text-sm font-medium text-[#F8FCF7] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-[#1E4D3A]">{message}</p>}
        <p className="mt-5 text-sm text-[#1E4D3A]">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button className="font-medium text-[#2F7A57] underline underline-offset-2" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} type="button">
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    function updateDisplayName(session) {
      setDisplayName(session?.user?.user_metadata?.display_name?.trim() ?? "");
    }

    supabase.auth.getSession().then(({ data }) => updateDisplayName(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => updateDisplayName(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FCF7] text-[#1E4D3A]">
      <BotanicalBackground />
      {page !== "login" && <ProfileButton onProfile={() => setPage("profile")} />}
      {page === "login" ? <LoginPage onBack={() => setPage("home")} onSuccess={() => setPage("profile")} /> : page === "profile" ? <ProfilePage onBack={() => setPage("home")} onDeleted={() => setPage("home")} onLogin={() => setPage("login")} /> : page === "history" ? <HistoryPage onBack={() => setPage("home")} /> : page === "plan" ? <PlanAheadPage onBack={() => setPage("home")} /> : page === "shopping" ? <ShoppingListPage onBack={() => setPage("home")} /> : page === "today" ? <TodayPage onBack={() => setPage("home")} /> : (
        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
          <p className="text-sm font-medium text-[#2F7A57]">MEAL PLANNER</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-semibold tracking-tight text-[#1E4D3A] sm:text-6xl">
            {displayName ? `Welcome, ${displayName}!` : "Welcome to Meal Planner!"}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#2F7A57]">Small, nourishing choices add up — give your body the care and energy it deserves today.</p>
          <div className="mt-12 grid grid-cols-4 gap-5">
            {actions.map((action) => (
              <div className="h-full transition-transform duration-200 hover:scale-105" key={action.title}>
                <CardSpotlight className="min-h-64 !border-[#2F7A57] !bg-[#DCEFE0] p-6" color="#2F7A57">
                  <button className="relative z-10 flex h-full w-full flex-col justify-between text-left" onClick={() => action.title === "Today’s meals" ? setPage("today") : action.title === "Meal history" ? setPage("history") : action.title === "Plan ahead" ? setPage("plan") : action.title === "Shopping list" && setPage("shopping")} type="button">
                    <span className="text-2xl font-semibold text-[#2F7A57]">{action.title}</span>
                    <span><span className="block text-sm leading-6 text-[#1E4D3A]">{action.description}</span><span className="mt-4 block text-[#2F7A57]">Open →</span></span>
                  </button>
                </CardSpotlight>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
