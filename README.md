# Habitat
_Habitat_ is a health and habit tracking application designed to help users build healthier and productive lifestyles. People often have good and strong intentions to improve their lifestyle and health but are overwhelmed when they try to maintain all their goals. With _Habitat_, users can maintain and monitor their habits with a unified platform for multiple lifestyle categories, including nutrition, sleep, mental health, procrastination, as well as customizable/personal goals. With this data, the system recognizes trends and patterns to provide meaningful insights so users can stay productive and keep up with their improved lifestyles without getting discouraged.

## Team
We are a team of 5 full-stack engineers:
- Jessica de Brito
- Sanika Deshmukh
- Somaiya Hassan
- Swetha Mohandass
- Joseph Scarpulla

## Installation Guide
The development of this project will require the usage of:
- Node.js/Express
- Prisma
- PostgreSQL
- React Native

To check if you have installed everything, please check the following in your terminal:
```
git --version
node -v
npm -v
java -version
psql --version
pg_isready
```
_Note: If you have already installed PostgreSQL but ``psql --version`` is not verified, you may not have PostgreSQL in your PATH._
</br></br>
If any of these are not verified, please install the necessary packages and verify again.

## Version Control Steps
Push changes first:
```
git add .
git commit -m <message>
git push
```
To merge into the main branch in terminal:
```
git checkout main
git merge <your-branch-name>
```
Fix merge conflicts if necessary
</br>
If you get a funny looking prompt that tells you to write a message just write a message and do Escape → ``:q!``


To merge from main to your branch in terminal:
```
# Starting in main branch
git pull
git checkout <your-branch-name>
git merge main
git push
```

</br>
Remember to ``npx expo install expo-image-picker``

## Steps for Migrating Prisma

```
cd backend
npx migrate prisma dev
npx prisma generate
npx prisma db seed
# if this doesn't work
npm install ts-node --save-dev
```
Both of the following use port 3000: </br>
When running on android studio, use ``10.0.2.2`` as the ip address.
For ios, use ``localhost`` as ip address.

## Testing

This project includes both unit tests and integration tests.

What is covered
### Backend integration test

The backend includes an integration test for the Add Custom Habit use case.

This test verifies that:

- a verified test user can log in
- the user can create a new custom habit
- the habit is stored successfully
- the habit can be retrieved afterward through the habits endpoint

#### Backend test setup

The backend tests use:

- Jest
- Supertest
- Prisma

##### Install backend test dependencies

If they are not already installed:
```
cd backend
npm install --save-dev jest supertest
Run backend tests
cd backend
npm test
```
##### Expected backend result

The backend integration test should:

- return 200 for login
- return 201 or 200 for habit creation
- return 200 for habit retrieval
- confirm that the created habit appears in the returned habit list
#### Notes
The integration test creates a temporary verified test user
Test data is cleaned up before and after the test
This test touches the backend and database

### Mobile unit test

The mobile app includes a unit test for the Calendar screen.

This test verifies that:

- the Calendar screen renders correctly
- mocked habit data is displayed on the screen
- frontend rendering logic works without needing the real backend
- Prerequisites

Make sure you have these installed:

- Node.js
- npm
- project dependencies for both backend and mobile

If dependencies are not installed yet, run:
```
cd backend
npm install
```
```
cd ../mobile
npm install
```

#### Mobile test setup

The mobile tests use:

- Jest
- jest-expo
- @testing-library/react-native
##### Install mobile test dependencies

If they are not already installed:
```
cd mobile
npm install
npm install --save-dev react-test-renderer@19.1.0 --save-exact
npm install --save-dev @testing-library/react-native @testing-library/jest-native --legacy-peer-deps
Run mobile tests
cd mobile
npm test
```
##### Expected mobile result

The mobile unit test should:

- render the Calendar screen successfully
- display mocked habit data such as "Drink Water"
- pass without requiring the real backend
#### Notes
- The mobile unit test does not call the real backend
- API requests are mocked
- This test is isolated to frontend rendering logic
### Test file locations
Backend
- backend/tests/integration/add-habit.test.js

Mobile
- mobile/__tests__/unit/calendar.test.tsx
