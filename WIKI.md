# Alpha ETF: Powetred by AI 📈🤖

Alpha ETF to innowacyjna macierz analityczna oraz aplikacja doradcza (robo-advisor). Projekt bazuje na koncepcji **Agentic Workflow** i udowadnia, jak duży wpływ w obszarze WealthTech i FinTech ma generatywna sztuczna inteligencja. Aplikacja ułatwia analizę, porównywanie i budowanie portfeli inwestycyjnych opartych na funduszach ETF.

## 🌟 Główne Funkcjonalności (Core Features)

### 1. 🤖 AI Roboadvisor: Natural Language Portfolio Builder
Przełomowy moduł, który tłumaczy język naturalny użytkownika (np. *"Mam 30 lat, akceptuję duże ryzyko i wierzę w amerykański sektor technologiczny"*) na zoptymalizowany pod kątem alokacji portfel inwestycyjny.
*   **Prompt-to-Portfolio**: Interfejs wykorzystujący w tle framework LLM do podejmowania decyzji alokacyjnych w oparciu o ustaloną bazę bezpiecznych i płynnych ETF-ów.
*   **Explainable AI (XAI)**: Każdy komponent portfela posiada uargumentowane powody inwestycyjne (Reasoning).
*   **Wizualizacja**: Dynamicznie generowane wykresy kołowe (Pie Charts) obrazujące proponowane proporcje.

### 2. 🌐 Live Market Pulse: News Sentiment & Geopolitics
Dashboard czasu rzeczywistego (Agentic RAG podłączony do żywego internetu), pełniący rolę wirtualnego asystenta śledzącego rynki finansowe.
*   **Real-time Grounding (Google Search)**: Agent AI pobiera najświeższe wiadomości ze świata finansów i geopolityki.
*   **Sentiment Engine**: Automatyczna klasyfikacja sentymentu ('Pozytywny', 'Neutralny', 'Negatywny') oraz ocenianie ogólnego ryzyka geopolitycznego.
*   **Actionable Insights**: Podsumowanie pokazujące przewidywany wpływ każdego wydarzenia na wybrane klasy aktywów i ETFy.

### 3. 📊 Zaawansowany Komparator ETF (Split-View Comparator)
Moduł pozwalający użytkownikowi na manualne, profesjonalne zestawienie dwóch funduszy ETF obok siebie.
*   **Dane Fundamentalne:** Całkowite koszty (TER), replikacja, polityka dywidendowa (Akumulujący vs Dystrybuujący), wielkość (AUM).
*   **Alokacje Geo/Sekatory**: Wizualizacje zdywersyfikowania ETF-ów na strefy geograficzne oraz sektory gospodarki.

### 4. 🧠 AI Analysis Dashboard (Personalized Comparison)
Ekspert finansowy AI (LLM Analyst), który nie tylko pokazuje suche liczby, ale analizuje podane ETFy pod kątem spersonalizowanego profilu inwestora.
*   Kontekstowe podsumowania i wyłonienie zwycięzcy na podstawie podanego **horyzontu czasowego** i preferencji podatkowych.
*   Ewaluacja czynników wielowymiarowych (Cross-factor Analysis) – Koszty, optymalizacja podatkowa, bezpieczeństwo funduszy.

## 🛠️ Architektura Rozwiązania i Tech Stack

Aplikacja to SPA (Single Page Application) działające całkowicie po stronie klienta, jednakże z silną integracją modeli językowych jako backendu kognitywnego.

*   **Frontend**: React 19, TypeScript, Vite.
*   **Styling**: Tailwind CSS, zapewniający responsywny design i koncepcję "Najlepszego UX" łączącego pragmatyzm terminali finansowych i prostotę aplikacji konsumenckich.
*   **Wizualizacja Danych**: Wykresy renderowane z użyciem biblioteki `recharts`.
*   **AI Engine**: Integracja `@google/genai` (modele Gemini 3.0 Flash/Gemini 2.5 Flash).
*   **Agentic Tools**: Modele używają narzędzi zewnętrznych (Google Search API, Mapy/Lokacje), dostarczając prawdziwych danych aktualizowanych na bieżąco, bez zniekształceń wynikających z dat obcięcia wiedzy modelu kognitywnego (Knowledge Cut-off).

---

> Projekt stworzony jako realizacja innowacyjnej ścieżki zaliczeniowej AI Product Manager. Pokazuje synergię między tradycyjnymi metrykami finansowymi a możliwościami nowoczesnych inteligentnych asystentów z gatunku Agentic AI.
