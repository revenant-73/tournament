**TVVC Tournament App**

Full Application Specification, Tech Stack & Build Plan

Tualatin Valley Volleyball Club \| March 2026

1\. Application Overview

A branded, mobile-first tournament management web app for TVVC grass
doubles events. Parents and coaches access live schedules and results by
scanning a QR code at the door. The tournament director (admin) manages
all tournament data --- teams, pools, scores, and brackets --- through a
password-protected admin interface. The app is hosted on GitHub Pages
with Supabase as the backend database.

**Primary goal:** Replace third-party tournament platforms (AES,
VolleyballLife) with a controlled, cost-free, consistently branded
experience.

**Hosting:** GitHub Pages (static) + Supabase (database/API)

**Access:** Public read-only via QR code. Admin write access via
password.

2\. User Roles

2.1 Public User (Parents & Coaches)

-   Accesses app by scanning QR code posted at the tournament venue

-   Read-only access --- cannot modify any data

-   No login required

-   Views team list, pool schedules, live standings, and bracket results

2.2 Admin (Tournament Director)

-   Single admin --- the tournament director only

-   Authenticated via simple password (stored in Supabase)

-   Full write access to all tournament data

-   Manages tournament setup, live score entry, and bracket seeding

3\. Public User Experience

3.1 Entry Flow

User scans QR code → lands on app. If multiple age groups exist, lands
on age group selector screen first. If single age group, goes directly
to home screen.

3.2 Home Screen

Clean, branded home screen with navigation buttons for:

-   Team List --- all teams registered in the tournament

-   Pool A, Pool B, Pool C (one button per pool, labeled with pool name
    and court)

-   Gold Bracket

-   Silver Bracket

-   Tournament Info / Rules

3.3 Team List Screen

-   Lists all teams in the age group

-   Each team name links to that team\'s full schedule --- all pool
    matches and bracket matches

3.4 Pool Screen

Each pool has its own screen showing:

-   Court assignment

-   Full match schedule in order (Match 1, Match 2\... Match 6 for a
    4-team pool)

-   Each match shows team names, scores (once entered), and match status

-   Live standings table ranked by: matches won → sets won → point
    differential

-   Standings update in real time as admin enters scores

3.5 Bracket Screen

Visual single-elimination bracket tree showing:

-   Bracket name (Gold or Silver)

-   All rounds: Round 1 (quarterfinals with byes), Semifinals, Final

-   Team names populate as seeding is completed or matches advance

-   Scores appear once matches are completed

-   Winner highlighted at the top of the bracket

3.6 Tournament Info Screen

-   Static text block --- rules, format description, contact info

-   Set by admin at tournament creation, not updated during the event

4\. Admin Experience

4.1 Authentication

Admin accesses /admin route. Password prompt appears. Password verified
against value stored in Supabase tournaments table. Session stored in
localStorage --- admin stays logged in until they clear it or log out.
No backend auth service required.

4.2 Tournament Setup

1.  Create tournament: name, date, location, info/rules text, admin
    password

2.  Create age groups (e.g., Open, A Division) with display order

3.  Enter team names, assign each team to an age group

4.  Create pools: name (Pool A/B/C), court assignment, display order

5.  Assign teams to pools (tap to assign from unassigned team list)

6.  Build pool match schedule: for each pool, enter matches in order ---
    select Team 1 vs Team 2 from the pool\'s team list

4.3 Live Score Entry

During pool play, admin navigates to any pool\'s admin view. Matches are
listed in order. Admin taps a match to enter scores:

-   Set 1 score: Team 1 score / Team 2 score

-   Set 2 score: Team 1 score / Team 2 score

-   Set 3 score (if needed): Team 1 score / Team 2 score

-   App validates scores: sets 1-2 must reach 25 win by 2; set 3 must
    reach 15 win by 2

-   On save, match status changes to complete, standings recalculate and
    update live

4.4 Bracket Seeding

After pool play ends, admin navigates to bracket seeding page. App
displays:

-   Ranked list of all 12 teams across all pools (using same tiebreaker:
    matches won → sets won → point differential)

-   Top 6 teams designated for Gold bracket, bottom 6 for Silver bracket

-   Admin taps a team from the ranked list, then taps a bracket seed
    slot (1-6) to assign them

-   Admin completes seeding for both Gold and Silver brackets
    independently

-   Bracket matches are auto-generated based on seeding: seeds 3v6 and
    4v5 in Round 1; seeds 1 and 2 receive byes to Semifinals

4.5 Bracket Score Entry

Identical flow to pool score entry. Admin taps a bracket match, enters
set scores, saves. Winner auto-advances to the next match slot. Bracket
display updates live for public users.

5\. Business Rules & Logic

5.1 Scoring Format

-   Sets 1 and 2: first to 25 points, win by 2 (no cap)

-   Set 3 (if needed): first to 15 points, win by 2 (no cap)

-   Match winner: best of 3 sets

5.2 Pool Standings Tiebreaker

Teams ranked in the following order:

7.  Matches won (most wins first)

8.  Sets won across all matches

9.  Point differential (points scored minus points allowed, all sets)

5.3 Cross-Pool Seeding

After pool play, all 12 teams are ranked using the identical tiebreaker
formula applied across the full pool play dataset --- not per-pool.
Seeds 1-6 go to Gold bracket; seeds 7-12 go to Silver bracket.

5.4 Bracket Structure (6 teams, single elimination)

-   Round 1: Seed 3 vs Seed 6 \| Seed 4 vs Seed 5

-   Semifinal: Seed 1 vs winner of (3v6) \| Seed 2 vs winner of (4v5)

-   Final: Semifinal winners

-   Both Gold and Silver brackets run simultaneously

5.5 Score Validation Rules

-   Set 1 and Set 2: winning score \>= 25, margin \>= 2, loser cannot
    have won

-   Set 3: winning score \>= 15, margin \>= 2, loser cannot have won

-   Set 3 only created if sets 1 and 2 are split

6\. Technology Stack

6.1 Frontend

**Framework:** React 18 via Vite

**Routing:** React Router v6

**Database Client:** \@supabase/supabase-js

**Styling:** CSS Modules or Tailwind CSS

**Hosting:** GitHub Pages (static, deployed via gh-pages npm package)

**Build Tool:** Vite

6.2 Backend / Database

**Platform:** Supabase (PostgreSQL)

**Auth:** None --- simple password stored in tournaments table, verified
client-side

**Realtime:** Supabase Realtime subscriptions for live standings and
bracket updates

**Security:** Supabase anon key exposed in frontend (accepted tradeoff
for low-stakes internal app)

6.3 Key npm Packages

-   vite + \@vitejs/plugin-react --- build tooling

-   react-router-dom --- client-side routing

-   \@supabase/supabase-js --- database queries and realtime

-   gh-pages --- GitHub Pages deployment

6.4 Repository Structure

tournament-app/ ├── src/ │ ├── components/ \# Shared UI components │ ├──
pages/ │ │ ├── public/ \# Home, Pool, Bracket, TeamList, Info │ │ └──
admin/ \# Login, Setup, ScoreEntry, Seeding │ ├── lib/ │ │ ├──
supabase.js \# Supabase client │ │ └── scoring.js \# Standings &
tiebreaker logic │ └── App.jsx \# Router setup ├── vite.config.js └──
package.json

7\. Database Schema

tournaments

  -----------------------------------------------------------------------------
  **Field**        **Type**      **Nullable**   **Notes**
  ---------------- ------------- -------------- -------------------------------
  id               uuid PK       No             Auto-generated

  name             text          No             e.g. TVVC Summer Grass Open

  date             date          No             Tournament date

  location         text          Yes            Venue name or address

  info             text          Yes            Static rules/info block

  is_active        boolean       No             Controls which tournament is
                                                live

  admin_password   text          No             Plaintext, low-stakes app

  created_at       timestamp     No             Auto-set
  -----------------------------------------------------------------------------

age_groups

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  tournament_id   uuid FK       No             → tournaments.id

  name            text          No             e.g. Open, A Division

  display_order   integer       No             Sort order on screen
  ----------------------------------------------------------------------------

teams

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  age_group_id    uuid FK       No             → age_groups.id

  name            text          No             Team name
  ----------------------------------------------------------------------------

pools

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  age_group_id    uuid FK       No             → age_groups.id

  name            text          No             e.g. Pool A

  court           text          No             e.g. Court 1

  display_order   integer       No             Sort order
  ----------------------------------------------------------------------------

pool_teams

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  pool_id         uuid FK       No             → pools.id

  team_id         uuid FK       No             → teams.id
  ----------------------------------------------------------------------------

brackets

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  age_group_id    uuid FK       No             → age_groups.id

  name            text          No             Gold or Silver

  display_order   integer       No             Sort order
  ----------------------------------------------------------------------------

matches

  -------------------------------------------------------------------------------
  **Field**          **Type**      **Nullable**   **Notes**
  ------------------ ------------- -------------- -------------------------------
  id                 uuid PK       No             

  age_group_id       uuid FK       No             → age_groups.id

  match_type         text          No             \'pool\' or \'bracket\'

  pool_id            uuid FK       Yes            → pools.id, if pool match

  bracket_id         uuid FK       Yes            → brackets.id, if bracket match

  bracket_round      integer       Yes            1=QF, 2=SF, 3=Final

  bracket_position   integer       Yes            Position within round

  team1_id           uuid FK       Yes            → teams.id, null until seeded

  team2_id           uuid FK       Yes            → teams.id, null until seeded

  court              text          Yes            Court assignment

  match_order        integer       No             Sequence within pool/round

  status             text          No             \'scheduled\' or \'complete\'

  winner_id          uuid FK       Yes            → teams.id, set on completion

  source_match1_id   uuid FK       Yes            Match feeding team1 slot

  source_match2_id   uuid FK       Yes            Match feeding team2 slot

  created_at         timestamp     No             Auto-set
  -------------------------------------------------------------------------------

sets

  ----------------------------------------------------------------------------
  **Field**       **Type**      **Nullable**   **Notes**
  --------------- ------------- -------------- -------------------------------
  id              uuid PK       No             

  match_id        uuid FK       No             → matches.id

  set_number      integer       No             1, 2, or 3

  team1_score     integer       No             

  team2_score     integer       No             
  ----------------------------------------------------------------------------

8\. Build & Deploy Todo List

Phase 1 --- Project Setup

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Create Vite + React project: npm create    Setup          
           vite@latest tournament-app \-- \--template                
           react                                                     

  2        Install dependencies: react-router-dom,    Setup          
           \@supabase/supabase-js, gh-pages                          

  3        Configure vite.config.js with base:        Setup          Needed for
           \'/tournament-app/\'                                      GitHub Pages
                                                                     routing

  4        Add homepage, predeploy, and deploy        Setup          
           scripts to package.json                                   

  5        Create GitHub repo, push initial commit    Setup          

  6        Run npm run deploy, verify Vite default    Setup          Confirm
           page loads on GitHub Pages URL                            before
                                                                     writing any
                                                                     app code
  -------------------------------------------------------------------------------

Phase 2 --- Supabase Setup

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Create Supabase project                    Database       

  2        Run schema SQL: create all 7 tables with   Database       
           correct types and foreign keys                            

  3        Enable Supabase Realtime on matches and    Database       Needed for
           sets tables                                               live
                                                                     standings

  4        Create src/lib/supabase.js with client     Database       
           initialized from env vars                                 

  5        Add .env file with VITE_SUPABASE_URL and   Database       Do not
           VITE_SUPABASE_ANON_KEY                                    commit to
                                                                     repo

  6        Configure GitHub repo secrets for Vite env Database       
           vars in GitHub Actions (if using CI)                      

  7        Test basic read/write from React app to    Database       
           Supabase                                                  
  -------------------------------------------------------------------------------

Phase 3 --- Routing & Page Shells

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Set up React Router in App.jsx with all    Frontend       
           public and admin routes                                   

  2        Create page shell components: Home,        Frontend       Public pages
           AgeGroupSelector, TeamList, PoolView,                     
           BracketView, TournamentInfo                               

  3        Create page shell components: AdminLogin,  Frontend       Admin pages
           AdminDashboard, AdminPoolSetup,                           
           AdminScoreEntry, AdminBracketSeeding                      

  4        Implement AdminRoute wrapper: redirects to Frontend       
           login if not authenticated                                

  5        Implement admin password check against     Frontend       
           Supabase tournaments table, store session                 
           in localStorage                                           

  6        Verify routing works correctly on GitHub   Frontend       
           Pages (hash router or basename config)                    
  -------------------------------------------------------------------------------

Phase 4 --- Tournament & Pool Setup (Admin)

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Build AdminDashboard: shows active         Admin          
           tournament summary, links to all admin                    
           sub-pages                                                 

  2        Build tournament creation form: name,      Admin          
           date, location, info text, admin password                 

  3        Build age group creation: name, display    Admin          
           order, linked to tournament                               

  4        Build team entry: team name input, age     Admin          
           group assignment                                          

  5        Build pool creation: pool name, court,     Admin          
           display order, age group assignment                       

  6        Build team-to-pool assignment UI: tap team Admin          
           from unassigned list, tap pool to assign                  

  7        Build match schedule builder: for each     Admin          
           pool, add matches by selecting team1 vs                   
           team2 from pool teams                                     
  -------------------------------------------------------------------------------

Phase 5 --- Public Pool View

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Build PoolView page: fetch pool data,      Public         
           match schedule, and set scores from                       
           Supabase                                                  

  2        Display match schedule with team names,    Public         
           court, match order                                        

  3        Build standings calculation function in    Public         
           src/lib/scoring.js: matches won → sets won                
           → point differential                                      

  4        Display live standings table, sorted by    Public         
           tiebreaker formula                                        

  5        Subscribe to Supabase Realtime on sets     Public         Live updates
           table for this pool --- recompute                         
           standings on any change                                   
  -------------------------------------------------------------------------------

Phase 6 --- Admin Score Entry

  --------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- -------------
  1        Build AdminScoreEntry page: lists all      Admin          
           matches for a selected pool                               

  2        Build score entry form: set 1, set 2, set  Admin          
           3 (conditional) score inputs for both                     
           teams                                                     

  3        Implement score validation: winning score  Admin          
           thresholds and win-by-2 rules                             

  4        On save: write set rows to Supabase,       Admin          
           update match status to complete, set                      
           winner_id                                                 

  5        Verify standings on PoolView update in     Admin          Integration
           real time after score entry                               test
  --------------------------------------------------------------------------------

Phase 7 --- Bracket Seeding (Admin)

  -------------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------------
  1        Build cross-pool standings calculation:    Admin          
           rank all 12 teams using same tiebreaker                   
           across full dataset                                       

  2        Build AdminBracketSeeding page: show       Admin          
           ranked team list, show seed slots 1-6 for                 
           Gold and Silver                                           

  3        Implement tap-to-seed interaction: tap     Admin          Mobile-friendly,
           team → tap seed slot → confirms assignment                no drag-and-drop

  4        On seeding completion: auto-generate       Admin          Round 1: 3v6, 4v5.
           bracket matches in Supabase using                         SF: 1 vs winner, 2
           source_match references                                   vs winner

  5        Seed Semifinal and Final match rows with   Admin          
           correct source_match1_id and                              
           source_match2_id                                          
  -------------------------------------------------------------------------------------

Phase 8 --- Bracket Score Entry & Auto-Advance

  ---------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- --------------
  1        Extend AdminScoreEntry to handle bracket   Admin          
           matches (same score entry form)                           

  2        On bracket match completion: look up       Admin          
           matches where source_match1_id or                         
           source_match2_id = completed match id                     

  3        Write winner_id into the team slot of the  Admin          Auto-advance
           next match automatically                                  logic

  4        Verify full bracket progression works:     Admin          
           Round 1 → SF → Final                                      
  ---------------------------------------------------------------------------------

Phase 9 --- Bracket Visual Display (Public)

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Build BracketView component: renders       Public         
           graphical single-elimination bracket tree                 

  2        Display all rounds: Round 1 (with bye      Public         
           slots for seeds 1 & 2), Semifinals, Final                 

  3        Show team names in bracket slots, scores   Public         
           once complete, winner highlighted                         

  4        Subscribe to Supabase Realtime on matches  Public         Live updates
           table for this bracket --- re-render on                   
           any change                                                

  5        Verify both Gold and Silver brackets       Public         
           display and update correctly                              
  -------------------------------------------------------------------------------

Phase 10 --- Polish & Launch

  -------------------------------------------------------------------------------
  **\#**   **Task**                                   **Category**   **Notes**
  -------- ------------------------------------------ -------------- ------------
  1        Build TeamList page: all teams with links  Public         
           to each team\'s schedule (pool matches +                  
           bracket matches)                                          

  2        Build TournamentInfo page: renders static  Public         
           info text from tournament record                          

  3        Build AgeGroupSelector screen: shown when  Public         
           multiple age groups exist                                 

  4        Apply consistent branding: TVVC colors,    Design         
           fonts, logo                                               

  5        Ensure all public-facing pages are fully   Design         Primary use
           mobile-responsive                                         case is
                                                                     phone

  6        Generate QR code pointing to the GitHub    Launch         
           Pages URL                                                 

  7        End-to-end test: full tournament           QA             
           simulation from setup through final                       
           bracket match                                             

  8        Deploy final build via npm run deploy      Launch         
  -------------------------------------------------------------------------------
