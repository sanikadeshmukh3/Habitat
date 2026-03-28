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
