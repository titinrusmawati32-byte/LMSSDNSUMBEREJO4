import React, { useState, useEffect } from 'react';
import { UserProfile, LearningMaterial, QuizExam, DigitalBook, LearningVideo, SystemAnnouncement, ClassSchedule, SchoolSettings } from './types';
import { MOCK_MATERIALS, MOCK_QUIZZES, MOCK_BOOKS, MOCK_VIDEOS, MOCK_ANNOUNCEMENTS, MOCK_USERS, MOCK_SCHEDULES } from './data/mockData';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { GuruDashboard } from './components/GuruDashboard';
import { SiswaDashboard } from './components/SiswaDashboard';
import { useResponsive } from './hooks/useResponsive';
import { db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  seedInitialDataIfEmpty,
  subscribeMaterials,
  subscribeQuizzes,
  subscribeBooks,
  subscribeVideos,
  subscribeAnnouncements,
  subscribeUsers,
  subscribeSchedules,
  subscribeSchoolSettings,
  getLocalSchoolSettings,
  addMaterialToDb,
  deleteMaterialFromDb,
  addQuizToDb,
  deleteQuizFromDb,
  addBookToDb,
  deleteBookFromDb,
  addVideoToDb,
  deleteVideoFromDb,
  addScheduleToDb,
  updateScheduleInDb,
  deleteScheduleFromDb,
  updateUserInDb
} from './lib/lmsDb';

export default function App() {
  // Persistence 1: Load user from localStorage to persist login state across refreshes
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('edusmart_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isDarkMode] = useState(true);
  const { width, isMobile } = useResponsive();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(getLocalSchoolSettings());

  // Content state shared between Guru uploads, Siswa viewing, and Admin announcements
  const [materials, setMaterials] = useState<LearningMaterial[]>(MOCK_MATERIALS);
  const [quizzes, setQuizzes] = useState<QuizExam[]>(MOCK_QUIZZES);
  const [books, setBooks] = useState<DigitalBook[]>(MOCK_BOOKS);
  const [videos, setVideos] = useState<LearningVideo[]>(MOCK_VIDEOS);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(MOCK_ANNOUNCEMENTS);
  const [usersList, setUsersList] = useState<UserProfile[]>(MOCK_USERS);
  const [schedules, setSchedules] = useState<ClassSchedule[]>(MOCK_SCHEDULES);

  // Initialize and seed Firebase Firestore if empty, and subscribe to real-time updates
  useEffect(() => {
    seedInitialDataIfEmpty();

    const unsubMaterials = subscribeMaterials((items) => setMaterials(items));
    const unsubQuizzes = subscribeQuizzes((items) => setQuizzes(items));
    const unsubBooks = subscribeBooks((items) => setBooks(items));
    const unsubVideos = subscribeVideos((items) => setVideos(items));
    const unsubAnnouncements = subscribeAnnouncements((items) => setAnnouncements(items));
    const unsubUsers = subscribeUsers((items) => setUsersList(items));
    const unsubSchedules = subscribeSchedules((items) => setSchedules(items));
    const unsubSettings = subscribeSchoolSettings((settings) => setSchoolSettings(settings));

    return () => {
      unsubMaterials();
      unsubQuizzes();
      unsubBooks();
      unsubVideos();
      unsubAnnouncements();
      unsubUsers();
      unsubSchedules();
      unsubSettings();
    };
  }, []);

  // Persistence & Real-time 2: Real-time active listener for the logged-in user profile
  useEffect(() => {
    if (!currentUser?.id) return;
    const docRef = doc(db, 'users', currentUser.id);
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const serverUser = snapshot.data() as UserProfile;
        
        // If status changed to inactive (e.g. suspended by admin on another device)
        if (serverUser.status === 'inactive') {
          setCurrentUser(null);
          localStorage.removeItem('edusmart_current_user');
          alert('Akun Anda telah dinonaktifkan oleh Administrator.');
          return;
        }

        // Deep-comparison check to prevent state updates on every single server ping
        const hasChanges = 
          serverUser.name !== currentUser.name ||
          serverUser.role !== currentUser.role ||
          serverUser.identifierNumber !== currentUser.identifierNumber ||
          serverUser.departmentOrClass !== currentUser.departmentOrClass ||
          serverUser.avatar !== currentUser.avatar ||
          serverUser.status !== currentUser.status ||
          serverUser.password !== currentUser.password;

        if (hasChanges) {
          setCurrentUser(serverUser);
          localStorage.setItem('edusmart_current_user', JSON.stringify(serverUser));
        }
      }
    }, (err) => {
      console.warn('Real-time sync of current user profile failed:', err);
    });

    return () => unsub();
  }, [currentUser?.id]);

  // Enforce dark mode class on root html element
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('edusmart_current_user');
  };

  const handleAddMaterial = (newItem: LearningMaterial) => {
    setMaterials(prev => [newItem, ...prev]);
    addMaterialToDb(newItem);
  };

  const handleAddQuiz = (newItem: QuizExam) => {
    setQuizzes(prev => [newItem, ...prev]);
    addQuizToDb(newItem);
  };

  const handleAddBook = (newItem: DigitalBook) => {
    setBooks(prev => [newItem, ...prev]);
    addBookToDb(newItem);
  };

  const handleAddVideo = (newItem: LearningVideo) => {
    setVideos(prev => [newItem, ...prev]);
    addVideoToDb(newItem);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    deleteMaterialFromDb(id);
  };

  const handleDeleteQuiz = (id: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== id));
    deleteQuizFromDb(id);
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    deleteBookFromDb(id);
  };

  const handleDeleteVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    deleteVideoFromDb(id);
  };

  const handleAddSchedule = (newSchedule: ClassSchedule) => {
    setSchedules(prev => [newSchedule, ...prev]);
    addScheduleToDb(newSchedule);
  };

  const handleUpdateSchedule = (updatedSchedule: ClassSchedule) => {
    setSchedules(prev => prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
    updateScheduleInDb(updatedSchedule);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    deleteScheduleFromDb(id);
  };

  const handleCompleteQuiz = (quizId: string, score: number) => {
    setQuizzes(prev => {
      const updated = prev.map(q => q.id === quizId ? { ...q, completedScore: score } : q);
      const target = updated.find(q => q.id === quizId);
      if (target) addQuizToDb(target);
      return updated;
    });
  };

  const handleUpdateCurrentUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    localStorage.setItem('edusmart_current_user', JSON.stringify(updated));
    setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
    updateUserInDb(updated);
  };

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('edusmart_current_user', JSON.stringify(user));
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => {}}
        allUsers={usersList}
        schoolSettings={schoolSettings}
      />
    );
  }

  return (
    <div>
      {currentUser?.role === 'admin' && (
        <AdminDashboard 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          isMobile={isMobile}
          schoolSettings={schoolSettings}
        />
      )}
      {currentUser?.role === 'guru' && (
        <GuruDashboard
          currentUser={currentUser}
          materials={materials}
          quizzes={quizzes}
          books={books}
          videos={videos}
          announcements={announcements}
          schedules={schedules}
          onAddMaterial={handleAddMaterial}
          onAddQuiz={handleAddQuiz}
          onAddBook={handleAddBook}
          onAddVideo={handleAddVideo}
          onDeleteMaterial={handleDeleteMaterial}
          onDeleteQuiz={handleDeleteQuiz}
          onDeleteBook={handleDeleteBook}
          onDeleteVideo={handleDeleteVideo}
          onAddSchedule={handleAddSchedule}
          onUpdateSchedule={handleUpdateSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onLogout={handleLogout}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          isMobile={isMobile}
          schoolSettings={schoolSettings}
        />
      )}
      {currentUser?.role === 'siswa' && (
        <SiswaDashboard
          currentUser={currentUser}
          materials={materials}
          quizzes={quizzes}
          books={books}
          videos={videos}
          announcements={announcements}
          schedules={schedules}
          onCompleteQuiz={handleCompleteQuiz}
          onLogout={handleLogout}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          isMobile={isMobile}
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
}
