/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIIntelligence from './pages/AIIntelligence';
import Admin from './pages/Admin';
import AdminSubscriptions from './pages/AdminSubscriptions';
import Advanced from './pages/Advanced';
import Analytics from './pages/Analytics';
import AppReadiness from './pages/AppReadiness';
import Billing from './pages/Billing';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Connect from './pages/Connect';
import ContextAware from './pages/ContextAware';
import Dashboard from './pages/Dashboard';
import DataProtection from './pages/DataProtection';
import EmailCampaigns from './pages/EmailCampaigns';
import FeedbackManagement from './pages/FeedbackManagement';
import Finance from './pages/Finance';
import Gamification from './pages/Gamification';
import Health from './pages/Health';
import Holidays from './pages/Holidays';
import IntegrationsHub from './pages/IntegrationsHub';
import Islam from './pages/Islam';
import Islamic from './pages/Islamic';
import IslamicFinance from './pages/IslamicFinance';
import Journal from './pages/Journal';
import Landing from './pages/Landing';
import Legal from './pages/Legal';
import MemberExclusive from './pages/MemberExclusive';
import MonthlyRecap from './pages/MonthlyRecap';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProductivitySuperpowers from './pages/ProductivitySuperpowers';
import Profile from './pages/Profile';
import Seamless from './pages/Seamless';
import Settings from './pages/Settings';
import Social from './pages/Social';
import SubscriptionManagement from './pages/SubscriptionManagement';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import TimeIntelligence from './pages/TimeIntelligence';
import Travel from './pages/Travel';
import UserProfile from './pages/UserProfile';
import VersionHistory from './pages/VersionHistory';
import Wellness from './pages/Wellness';
import Workflows from './pages/Workflows';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIIntelligence": AIIntelligence,
    "Admin": Admin,
    "AdminSubscriptions": AdminSubscriptions,
    "Advanced": Advanced,
    "Analytics": Analytics,
    "AppReadiness": AppReadiness,
    "Billing": Billing,
    "Calendar": Calendar,
    "Chat": Chat,
    "Connect": Connect,
    "ContextAware": ContextAware,
    "Dashboard": Dashboard,
    "DataProtection": DataProtection,
    "EmailCampaigns": EmailCampaigns,
    "FeedbackManagement": FeedbackManagement,
    "Finance": Finance,
    "Gamification": Gamification,
    "Health": Health,
    "Holidays": Holidays,
    "IntegrationsHub": IntegrationsHub,
    "Islam": Islam,
    "Islamic": Islamic,
    "IslamicFinance": IslamicFinance,
    "Journal": Journal,
    "Landing": Landing,
    "Legal": Legal,
    "MemberExclusive": MemberExclusive,
    "MonthlyRecap": MonthlyRecap,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductivitySuperpowers": ProductivitySuperpowers,
    "Profile": Profile,
    "Seamless": Seamless,
    "Settings": Settings,
    "Social": Social,
    "SubscriptionManagement": SubscriptionManagement,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "TimeIntelligence": TimeIntelligence,
    "Travel": Travel,
    "UserProfile": UserProfile,
    "VersionHistory": VersionHistory,
    "Wellness": Wellness,
    "Workflows": Workflows,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};