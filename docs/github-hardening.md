# GitHub 與帳號安全設定（只有你能做）

模板裡的程式與 CI 已經處理好，以下是需要你在 GitHub 介面上設定的項目。每個用這個模板建立的新 repo 都要做一次。

## 帳號（一次就好）

- [ ] **Settings → Password and authentication**：新增 Passkey 或硬體金鑰（YubiKey）作為兩步驟驗證；移除簡訊驗證。
- [ ] 同樣把雲端（GCP / AWS / Vercel）、網域商、Email 帳號都改用 Passkey / 硬體金鑰。
- [ ] 檢查 **Settings → Applications** 與 **Personal access tokens**：移除不用的授權；token 一律設到期日、最小權限（fine-grained）。

## 每個 repo

### Settings → General

- [ ] 模板 repo：勾選 **Template repository**，之後可以直接按 Use this template。
- [ ] Pull Requests：只允許 **Squash merging**；勾選 **Automatically delete head branches**。

### Settings → Branches（或 Rules → Rulesets）保護 `main`

- [ ] Require a pull request before merging（至少 1 個核准；個人專案可設 0 但仍需走 PR）
- [ ] Require review from Code Owners
- [ ] Require status checks to pass：`Lint / Typecheck / Test / Build / SCA`、`SAST (Semgrep)`、`Secret 掃描 (gitleaks)`，公開 repo 再加 `CodeQL`
- [ ] Require branches to be up to date before merging
- [ ] Block force pushes、Restrict deletions
- [ ] Require signed commits（選用，建議）

### Settings → Code security

- [ ] **Dependabot alerts** 與 **Dependabot security updates**：開啟
- [ ] **Private vulnerability reporting**：開啟（SECURITY.md 的通報管道）
- [ ] **Secret scanning** 與 **Push protection**：公開 repo 免費；私有 repo 需要 GitHub Secret Protection
- [ ] **Code scanning（CodeQL）**：公開 repo 免費；私有 repo 需要 GitHub Code Security

> 私有 repo 沒有購買 GitHub 安全方案時，CodeQL、Dependency Review、Artifact Attestations 會自動略過，
> 改由 Semgrep（SAST）、npm audit（SCA）、gitleaks（Secret）把關。

### Settings → Actions → General

- [ ] Actions permissions：**Allow select actions**，只允許 GitHub 官方與已在 workflow 中釘選 SHA 的 Action
- [ ] Workflow permissions：**Read repository contents**（預設唯讀）；不勾選「Allow GitHub Actions to create and approve pull requests」
- [ ] Fork pull request workflows：Require approval for all outside collaborators

### Settings → Secrets and variables → Actions

- [ ] `ANTHROPIC_API_KEY`（選用，LLM 紅隊測試用）：建議另建一把只給 CI 用、設定每月花費上限的金鑰
- [ ] 正式環境的祕密放在雲端 Secret Manager，不放 GitHub
