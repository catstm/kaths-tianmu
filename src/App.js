import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  CalendarX2,
  Database,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// --- 你的專屬雲端資料庫鑰匙 ---
const firebaseConfig = {
  apiKey: "AIzaSyBi1E4mtpCNUt3TQ_fWcacWKSsTWWj-3ws",
  authDomain: "kaths-ptc-tianmu.firebaseapp.com",
  projectId: "kaths-ptc-tianmu",
  storageBucket: "kaths-ptc-tianmu.firebasestorage.app",
  messagingSenderId: "669247777199",
  appId: "1:669247777199:web:5ee3f4c253dc5354ac675a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const schoolId = "kaths-tianmu";

const initialSettings = {
  startDate: "2026-04-01",
  endDate: "2026-04-30",
  blockedDates: [],
  maxTranslators: 3,
  slotDuration: 15,
  translatorOverrides: {}, // 新增：特殊日期的翻譯人數設定
  googleForm: {
    enabled: false,
    submitUrl: "",
    entryDate: "",
    entryTime: "",
    entryTeacher: "",
    entryClass: "",
    entryStudent: "",
    entryParent: "",
    entryPhone: "",
  },
};
const dayNames = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
];

export default function App() {
  const [view, setView] = useState("parent");
  const [settings, setSettingsState] = useState(initialSettings);
  const [teachers, setTeachersState] = useState([]);
  const [bookings, setBookingsState] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth).catch((e) => console.error("登入失敗:", e));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(
      doc(db, schoolId, "settings"),
      (docSnap) => {
        if (docSnap.exists())
          setSettingsState({ ...initialSettings, ...docSnap.data() });
      }
    );
    const unsubTeachers = onSnapshot(
      collection(db, `${schoolId}_teachers`),
      (snap) => {
        const tData = [];
        snap.forEach((doc) => tData.push({ id: doc.id, ...doc.data() }));
        setTeachersState(tData);
      }
    );
    const unsubBookings = onSnapshot(
      collection(db, `${schoolId}_bookings`),
      (snap) => {
        const bData = [];
        snap.forEach((doc) => bData.push({ id: doc.id, ...doc.data() }));
        setBookingsState(bData);
        setLoading(false);
      }
    );
    return () => {
      unsubSettings();
      unsubTeachers();
      unsubBookings();
    };
  }, [user]);

  const handleSetSettings = async (newSettings) => {
    setSettingsState(newSettings);
    await setDoc(doc(db, schoolId, "settings"), newSettings);
  };
  const handleSetTeachers = async (newTeachersArray) => {
    setTeachersState(newTeachersArray);
    for (const t of newTeachersArray)
      await setDoc(doc(db, `${schoolId}_teachers`, String(t.id)), t);
  };
  const handleDeleteTeacher = async (teacherId) => {
    await deleteDoc(doc(db, `${schoolId}_teachers`, String(teacherId)));
  };
  const handleAddBooking = async (newBooking) => {
    await setDoc(
      doc(db, `${schoolId}_bookings`, String(newBooking.id)),
      newBooking
    );
  };
  const handleDeleteBooking = async (bookingId) => {
    await deleteDoc(doc(db, `${schoolId}_bookings`, String(bookingId)));
  };

  if (loading)
    return (
      <div className="p-10 text-center text-blue-600 font-bold">
        系統連線中，請稍候...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <div className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          凱斯天母天玉校 PTC預約
        </div>
        <div className="flex bg-blue-700 rounded-lg p-1">
          <button
            className={`px-4 py-1 rounded-md text-sm font-medium ${
              view === "parent" ? "bg-white text-blue-700" : "text-blue-100"
            }`}
            onClick={() => setView("parent")}
          >
            家長預約端
          </button>
          <button
            className={`px-4 py-1 rounded-md text-sm font-medium ${
              view === "admin"
                ? "bg-white text-blue-700 shadow"
                : "text-blue-100 hover:text-white"
            }`}
            onClick={() => {
              if (window.prompt("請輸入行政密碼：") === "kaths888")
                setView("admin");
              else alert("密碼錯誤！");
            }}
          >
            行政後台
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-4">
        {view === "parent" ? (
          <ParentPortal
            settings={settings}
            teachers={teachers}
            bookings={bookings}
            onAddBooking={handleAddBooking}
          />
        ) : (
          <AdminPortal
            settings={settings}
            onUpdateSettings={handleSetSettings}
            teachers={teachers}
            onUpdateTeachers={handleSetTeachers}
            onDeleteTeacher={handleDeleteTeacher}
            bookings={bookings}
            onDeleteBooking={handleDeleteBooking}
          />
        )}
      </main>
    </div>
  );
}

function ParentPortal({ settings, teachers, bookings, onAddBooking }) {
  const [step, setStep] = useState(1);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({
    className: "",
    studentName: "",
    parentName: "",
    phone: "",
  });

  const getAvailableTimeSlots = (teacherId, dateStr) => {
    if (
      !teacherId ||
      !dateStr ||
      settings.blockedDates.includes(dateStr) ||
      dateStr < settings.startDate ||
      dateStr > settings.endDate
    )
      return [];
    const dayOfWeek = new Date(dateStr).getDay();
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return [];

    let allPossibleSlots = [];
    teacher.schedules
      .filter((s) => s.day === dayOfWeek)
      .forEach((sched) => {
        let current = new Date(`2000-01-01T${sched.start}:00`);
        const end = new Date(`2000-01-01T${sched.end}:00`);
        while (current < end) {
          allPossibleSlots.push(
            current.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
          );
          current = new Date(current.getTime() + settings.slotDuration * 60000);
        }
      });

    // 判斷今天的翻譯人數上限（如果有特殊設定就看特殊設定，沒有就看常態設定）
    const currentLimit =
      settings.translatorOverrides &&
      settings.translatorOverrides[dateStr] !== undefined
        ? parseInt(settings.translatorOverrides[dateStr])
        : settings.maxTranslators;

    return [...new Set(allPossibleSlots)]
      .filter((time) => {
        if (
          bookings.some(
            (b) =>
              b.teacherId === teacherId && b.date === dateStr && b.time === time
          )
        )
          return false;
        if (
          bookings.filter((b) => b.date === dateStr && b.time === time)
            .length >= currentLimit
        )
          return false;
        return true;
      })
      .sort();
  };

  const availableDates = useMemo(() => {
    const dates = [];
    let current = new Date(settings.startDate);
    const end = new Date(settings.endDate);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      if (!settings.blockedDates.includes(dateStr)) dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newBooking = {
      id: Date.now().toString(),
      teacherId: selectedTeacher,
      date: selectedDate,
      time: selectedTime,
      ...formData,
    };

    if (settings.googleForm?.enabled && settings.googleForm.submitUrl) {
      const formBody = new URLSearchParams();
      if (settings.googleForm.entryDate)
        formBody.append(settings.googleForm.entryDate, selectedDate);
      if (settings.googleForm.entryTime)
        formBody.append(settings.googleForm.entryTime, selectedTime);
      if (settings.googleForm.entryTeacher)
        formBody.append(
          settings.googleForm.entryTeacher,
          teachers.find((t) => t.id === selectedTeacher)?.name || ""
        );
      if (settings.googleForm.entryClass)
        formBody.append(settings.googleForm.entryClass, formData.className);
      if (settings.googleForm.entryStudent)
        formBody.append(settings.googleForm.entryStudent, formData.studentName);
      if (settings.googleForm.entryParent)
        formBody.append(settings.googleForm.entryParent, formData.parentName);
      if (settings.googleForm.entryPhone)
        formBody.append(settings.googleForm.entryPhone, formData.phone);
      fetch(settings.googleForm.submitUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
      }).catch((e) => console.log(e));
    }
    onAddBooking(newBooking);
    setStep(4);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="p-6">
        {step === 1 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-lg font-bold mb-4">
              1. 請問學生的外師是哪一位？
            </h3>
            {teachers.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTeacher(t.id);
                  setStep(2);
                }}
                className="w-full p-4 border-2 rounded-lg hover:border-blue-500 text-left font-medium"
              >
                {t.name}
              </button>
            ))}
            {teachers.length === 0 && (
              <p className="text-gray-500">目前尚無外師資料，請由後台新增。</p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-blue-600 mb-4"
            >
              ← 返回重選老師
            </button>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="font-bold mb-2 block">2-1: 選擇日期</label>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableDates.map((date) => {
                    const isAvailable =
                      getAvailableTimeSlots(selectedTeacher, date).length > 0;
                    return (
                      <button
                        key={date}
                        disabled={!isAvailable}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime("");
                        }}
                        className={`w-full p-3 rounded-lg border text-left ${
                          selectedDate === date
                            ? "bg-blue-600 text-white"
                            : isAvailable
                            ? "bg-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {date} {!isAvailable && "(無空檔)"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="font-bold mb-2 block">2-2: 選擇時段</label>
                {selectedDate ? (
                  <div className="grid grid-cols-2 gap-2">
                    {getAvailableTimeSlots(selectedTeacher, selectedDate).map(
                      (time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 border rounded ${
                            selectedTime === time
                              ? "bg-blue-600 text-white"
                              : "bg-white"
                          }`}
                        >
                          {time}
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">請先選擇日期</p>
                )}
                {selectedTime && (
                  <button
                    onClick={() => setStep(3)}
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg"
                  >
                    下一步
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-blue-600 mb-4"
            >
              ← 返回重選時間
            </button>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(() => {
                const t = teachers.find((x) => x.id === selectedTeacher);
                const classList = t?.classes
                  ? t.classes
                      .split(",")
                      .map((c) => c.trim())
                      .filter((c) => c)
                  : [];
                return classList.length > 0 ? (
                  <select
                    required
                    className="w-full p-3 border rounded-lg bg-white"
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      請選擇班級 *
                    </option>
                    {classList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type="text"
                    placeholder="班級名稱 *"
                    className="w-full p-3 border rounded-lg"
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                  />
                );
              })()}
              <input
                required
                type="text"
                placeholder="學生姓名 *"
                className="w-full p-3 border rounded-lg"
                value={formData.studentName}
                onChange={(e) =>
                  setFormData({ ...formData, studentName: e.target.value })
                }
              />
              <input
                required
                type="text"
                placeholder="家長姓名 *"
                className="w-full p-3 border rounded-lg"
                value={formData.parentName}
                onChange={(e) =>
                  setFormData({ ...formData, parentName: e.target.value })
                }
              />
              <input
                required
                type="tel"
                placeholder="聯絡電話 *"
                className="w-full p-3 border rounded-lg"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold"
              >
                確認送出
              </button>
            </form>
          </div>
        )}
        {step === 4 && (
          <div className="text-center py-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">預約成功！</h3>
            <button
              onClick={() => {
                setStep(1);
                setSelectedTeacher("");
                setSelectedDate("");
                setSelectedTime("");
                setFormData({
                  className: "",
                  studentName: "",
                  parentName: "",
                  phone: "",
                });
              }}
              className="text-blue-600 underline"
            >
              為另一位學生預約
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPortal({
  settings,
  onUpdateSettings,
  teachers,
  onUpdateTeachers,
  onDeleteTeacher,
  bookings,
  onDeleteBooking,
}) {
  const [activeTab, setActiveTab] = useState("settings");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideCount, setOverrideCount] = useState("");

  const handleExportCSV = () => {
    let csvContent = "\uFEFF日期,時間,教師,班級,學生姓名,家長聯絡人,電話\n";
    [...bookings]
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .forEach((b) => {
        const tName = teachers.find((t) => t.id === b.teacherId)?.name || "";
        csvContent += `"${b.date}","${b.time}","${tName}","${b.className}","${b.studentName}","${b.parentName}","${b.phone}"\n`;
      });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    );
    link.download = `PTC預約總表_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl shadow border border-gray-100 min-h-[500px]">
      <div className="w-full md:w-48 bg-gray-50 p-4 border-r">
        {["settings", "teachers", "bookings", "googleForm"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full text-left p-2 mb-2 rounded ${
              activeTab === tab
                ? "bg-blue-100 text-blue-700 font-bold"
                : "text-gray-600"
            }`}
          >
            {tab === "settings"
              ? "全域設定"
              : tab === "teachers"
              ? "教師排班"
              : tab === "bookings"
              ? "預約總表"
              : "連動表單"}
          </button>
        ))}
      </div>
      <div className="flex-1 p-6">
        {activeTab === "settings" && (
          <div className="space-y-4 max-w-md">
            <h3 className="font-bold text-lg border-b pb-2">
              開放區間與例外休假
            </h3>
            <input
              type="date"
              value={settings.startDate}
              onChange={(e) =>
                onUpdateSettings({ ...settings, startDate: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
            <input
              type="date"
              value={settings.endDate}
              onChange={(e) =>
                onUpdateSettings({ ...settings, endDate: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={() => {
                  if (newBlockedDate) {
                    onUpdateSettings({
                      ...settings,
                      blockedDates: [...settings.blockedDates, newBlockedDate],
                    });
                    setNewBlockedDate("");
                  }
                }}
                className="bg-gray-800 text-white px-3 rounded"
              >
                新增不開放日
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.blockedDates.map((d) => (
                <span
                  key={d}
                  className="bg-red-50 text-red-600 px-2 py-1 rounded text-sm flex items-center gap-1"
                >
                  {d}{" "}
                  <button
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        blockedDates: settings.blockedDates.filter(
                          (x) => x !== d
                        ),
                      })
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <hr className="my-6" />

            <h3 className="font-bold text-lg border-b pb-2">
              常態翻譯人數上限
            </h3>
            <label className="block text-sm text-gray-600 mb-1">
              同時間預設最多幾位翻譯？
            </label>
            <input
              type="number"
              value={settings.maxTranslators}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  maxTranslators: parseInt(e.target.value),
                })
              }
              className="w-full p-2 border rounded bg-yellow-50"
            />

            {/* --- 新增：特殊日期人數微調 --- */}
            <h4 className="font-bold text-md mt-6 mb-2 text-blue-800">
              ⚡ 特殊日期人數微調
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              若某天翻譯人數與常態不同（例如有人請假），可在此個別設定覆蓋。
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="p-2 border rounded flex-1"
              />
              <input
                type="number"
                placeholder="人數"
                value={overrideCount}
                onChange={(e) => setOverrideCount(e.target.value)}
                className="p-2 border rounded w-20"
              />
              <button
                onClick={() => {
                  if (overrideDate && overrideCount !== "") {
                    onUpdateSettings({
                      ...settings,
                      translatorOverrides: {
                        ...(settings.translatorOverrides || {}),
                        [overrideDate]: parseInt(overrideCount),
                      },
                    });
                    setOverrideDate("");
                    setOverrideCount("");
                  }
                }}
                className="bg-blue-600 text-white px-3 rounded shadow hover:bg-blue-700"
              >
                設定
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(settings.translatorOverrides || {}).map(
                ([d, count]) => (
                  <span
                    key={d}
                    className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {d} 改為 <strong>{count}</strong> 人
                    <button
                      onClick={() => {
                        const newOverrides = {
                          ...settings.translatorOverrides,
                        };
                        delete newOverrides[d];
                        onUpdateSettings({
                          ...settings,
                          translatorOverrides: newOverrides,
                        });
                      }}
                      className="text-blue-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                )
              )}
            </div>
          </div>
        )}
        {activeTab === "teachers" && (
          <div>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="新增老師名稱..."
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="p-2 border rounded"
              />
              <button
                onClick={() => {
                  if (newTeacherName) {
                    onUpdateTeachers([
                      ...teachers,
                      {
                        id: `t${Date.now()}`,
                        name: newTeacherName,
                        classes: "",
                        schedules: [],
                      },
                    ]);
                    setNewTeacherName("");
                  }
                }}
                className="bg-blue-600 text-white px-4 rounded"
              >
                新增
              </button>
            </div>
            <div className="space-y-4">
              {teachers.map((t) => (
                <div key={t.id} className="border p-4 rounded bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-lg">{t.name}</h4>
                    <button
                      onClick={() => onDeleteTeacher(t.id)}
                      className="text-red-500 text-sm"
                    >
                      刪除老師
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      該老師負責的班級 (請用逗號分隔)：
                    </label>
                    <input
                      type="text"
                      placeholder="例如: K1A, K2B, K3C"
                      className="w-full p-2 border rounded text-sm bg-white"
                      value={t.classes || ""}
                      onChange={(e) =>
                        onUpdateTeachers(
                          teachers.map((x) =>
                            x.id === t.id
                              ? { ...x, classes: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </div>

                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    已新增的開放時段：
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {t.schedules.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-white border p-1 rounded text-sm shadow-sm"
                      >
                        {dayNames[s.day]} {s.start}-{s.end}{" "}
                        <button
                          onClick={() => {
                            const n = [...t.schedules];
                            n.splice(idx, 1);
                            onUpdateTeachers(
                              teachers.map((x) =>
                                x.id === t.id ? { ...x, schedules: n } : x
                              )
                            );
                          }}
                          className="text-red-500 ml-1 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="font-bold text-blue-700 mb-3">
                      ⚡ 快速批次加入時段
                    </div>
                    <div className="flex flex-wrap gap-4 mb-3">
                      {dayNames.map((d, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-1 cursor-pointer text-sm font-medium text-gray-700"
                        >
                          <input
                            type="checkbox"
                            id={`day-${t.id}-${i}`}
                            value={i}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <input
                        id={`st-${t.id}`}
                        type="time"
                        defaultValue="12:30"
                        className="p-2 border rounded shadow-sm bg-white"
                      />
                      <span className="font-bold text-gray-500">-</span>
                      <input
                        id={`ed-${t.id}`}
                        type="time"
                        defaultValue="13:15"
                        className="p-2 border rounded shadow-sm bg-white"
                      />
                      <button
                        onClick={() => {
                          const start = document.getElementById(
                            `st-${t.id}`
                          ).value;
                          const end = document.getElementById(
                            `ed-${t.id}`
                          ).value;
                          const selectedDays = [];
                          for (let i = 0; i < 7; i++) {
                            const cb = document.getElementById(
                              `day-${t.id}-${i}`
                            );
                            if (cb && cb.checked) {
                              selectedDays.push(i);
                              cb.checked = false;
                            }
                          }
                          if (selectedDays.length === 0) {
                            alert("請至少在上方勾選一個星期！");
                            return;
                          }
                          const newSchedules = selectedDays.map((day) => ({
                            day,
                            start,
                            end,
                          }));
                          onUpdateTeachers(
                            teachers.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    schedules: [
                                      ...x.schedules,
                                      ...newSchedules,
                                    ],
                                  }
                                : x
                            )
                          );
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-bold md:ml-auto w-full md:w-auto mt-2 md:mt-0"
                      >
                        批次加入勾選的時段
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "bookings" && (
          <div>
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-4 py-2 rounded mb-4 text-sm"
            >
              匯出 Excel (CSV)
            </button>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">日期/時間</th>
                  <th className="p-2 border">教師</th>
                  <th className="p-2 border">班級/學生</th>
                  <th className="p-2 border">家長/電話</th>
                  <th className="p-2 border">操作</th>
                </tr>
              </thead>
              <tbody>
                {[...bookings]
                  .sort((a, b) =>
                    (a.date + a.time).localeCompare(b.date + b.time)
                  )
                  .map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="p-2">
                        {b.date} {b.time}
                      </td>
                      <td className="p-2">
                        {teachers.find((t) => t.id === b.teacherId)?.name}
                      </td>
                      <td className="p-2">
                        {b.className} / {b.studentName}
                      </td>
                      <td className="p-2">
                        {b.parentName} ({b.phone})
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => onDeleteBooking(b.id)}
                          className="text-red-500"
                        >
                          取消
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "googleForm" && (
          <div className="max-w-md space-y-4">
            <h3 className="font-bold border-b pb-2">
              Google 表單自動連動 (選填)
            </h3>
            <label className="flex items-center gap-2 font-bold text-blue-700">
              <input
                type="checkbox"
                checked={settings.googleForm?.enabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    googleForm: {
                      ...settings.googleForm,
                      enabled: e.target.checked,
                    },
                  })
                }
              />{" "}
              啟用背景連動
            </label>
            {settings.googleForm?.enabled && (
              <div className="space-y-2 text-sm">
                <input
                  type="text"
                  placeholder="表單 submit URL (結尾為 /formResponse)"
                  value={settings.googleForm.submitUrl}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      googleForm: {
                        ...settings.googleForm,
                        submitUrl: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 border rounded"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="日期 ID (entry.xxx)"
                    value={settings.googleForm.entryDate}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryDate: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="時間 ID (entry.xxx)"
                    value={settings.googleForm.entryTime}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryTime: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="教師 ID (entry.xxx)"
                    value={settings.googleForm.entryTeacher}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryTeacher: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="班級 ID (entry.xxx)"
                    value={settings.googleForm.entryClass}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryClass: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="學生 ID (entry.xxx)"
                    value={settings.googleForm.entryStudent}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryStudent: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="家長 ID (entry.xxx)"
                    value={settings.googleForm.entryParent}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryParent: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="電話 ID (entry.xxx)"
                    value={settings.googleForm.entryPhone}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        googleForm: {
                          ...settings.googleForm,
                          entryPhone: e.target.value,
                        },
                      })
                    }
                    className="border p-2 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
