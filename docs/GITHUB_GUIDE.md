# GitHub Starter Guide for FindIT

Git is the tool that tracks your code history. GitHub is the website where you store that history online and collaborate with your partner.

## 1. Connect GitHub Locally

You can use the GitHub CLI locally:

```bash
gh auth login
```

Choose GitHub.com, HTTPS, and follow the browser login steps.

## 2. Create a Repository

On GitHub:

1. Go to `https://github.com/new`.
2. Name the repository `findit`.
3. Choose Private or Public.
4. Do not add a README if you already have this project locally.
5. Create the repository.

## 3. Turn This Folder Into a Git Project

From this project folder:

```bash
git init
git add .
git commit -m "Create FindIT milestone 1 prototype"
```

## 4. Link Local Git to GitHub

GitHub will show you commands after you create the empty repository. They will look like this:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/findit.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## 5. Daily Workflow

Before starting work:

```bash
git pull
```

After making a useful change:

```bash
git status
git add .
git commit -m "Describe what changed"
git push
```

Good commit messages are short and specific, such as:

```text
Add found item form
Fix login error message
Style item cards with NUS colors
```

## 6. Working With Your Partner

A safe beginner workflow:

```bash
git checkout -b feature/item-search
```

Make your changes, then:

```bash
git add .
git commit -m "Add item search"
git push -u origin feature/item-search
```

On GitHub, open a pull request. Your partner can review it before it gets merged into `main`.

## 7. Preview Links

This repo has Firebase Hosting previews through GitHub Actions.

When you open a pull request, GitHub Actions builds the app and Firebase posts a preview link on
the PR. Use that link to test changes before merging.

When the PR is merged into `main`, GitHub Actions deploys the live site:

```text
https://nusfindit.web.app
```
