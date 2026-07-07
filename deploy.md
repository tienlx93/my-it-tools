# Deployment & CI/CD Configuration Guide

This document describes the environment variables and secrets required to run the GitHub Actions workflows for the **my-it-tools** project, along with step-by-step instructions on how to configure them.

---

## 1. Overview of Workflows

The project contains the following GitHub Actions workflows in the `.github/workflows/` directory:

1. **CI** (`ci.yml`): Runs on every pull request and push to the `main` branch. Validates code through linting, unit tests, type checks, and building.
   - **Secrets/Env required**: None.
2. **E2E Tests** (`e2e-tests.yml`): Runs Playwright end-to-end tests across multiple shards.
   - **Secrets/Env required**: None.
3. **Docker Nightly Release** (`docker-nightly-release.yml`): Runs daily or manually to build and push nightly Docker images to Docker Hub and GitHub Container Registry (GHCR).
   - **Secrets/Env required**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and `GITHUB_TOKEN`.
4. **Release New Versions** (`releases.yml`): Runs when a tag matching `v*.*.*` is pushed.
   - **Docker Release Job**: Builds and pushes production multi-platform Docker images to Docker Hub and GHCR.
   - **GitHub Release Job**: Zips the production client-side build and drafts a GitHub release with the changelog.
   - **Deploy Job**: Deploys the newly released Docker image to Google Cloud Run.
   - **Secrets/Env required**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `GITHUB_TOKEN`, `GCP_PROJECT_ID`, `GCP_SA_KEY`, `GCP_SERVICE_NAME`, and `GCP_REGION`.

---

## 2. Secrets & Environment Variables Reference

To enable publishing to Docker Hub and deploying to Google Cloud Run, configure the following secrets in GitHub:

### Repository Secrets (GitHub)

| Secret Name | Description | Current Value / Setting |
| :--- | :--- | :--- |
| `DOCKERHUB_USERNAME` | Your Docker Hub account username. | `tienlx93` |
| `DOCKERHUB_TOKEN` | A personal access token (PAT) generated from your Docker Hub settings. | *Configured* |
| `GCP_PROJECT_ID` | Your Google Cloud Platform project ID. | `my-it-tools` |
| `GCP_SA_KEY` | The JSON key of a GCP Service Account with permissions to deploy to Cloud Run. | *Configured* |
| `GCP_SERVICE_NAME` | The name of the Google Cloud Run service. | `it-tools` |
| `GCP_REGION` | The GCP Region where the service should deploy. | `asia-southeast1` |

### Automatic / System Secrets

| Secret Name | Description | Setup Required |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | Automatically generated token by GitHub for workflow authentication. | No manual secret creation needed, but requires **Write permissions** enabled in repository settings. |

---

## 3. Step-by-Step Setup Instructions

### Step 3.1: Configure Docker Hub Secrets

1. **Generate a Docker Hub Access Token**:
   - Log in to your [Docker Hub](https://hub.docker.com/) account.
   - Click on your profile icon at the top right and select **Account Settings**.
   - Navigate to **Security** -> **Personal access tokens**.
   - Click **New Access Token**.
   - Enter a description (e.g., `github-actions-my-it-tools`) and set the permissions to **Read, Write, Delete** (or **Read & Write**).
   - Copy the generated token immediately (you won't be able to see it again).

2. **Add Secrets to GitHub**:
   - Go to your GitHub repository.
   - Navigate to **Settings** -> **Secrets and variables** -> **Actions** in the left sidebar.
   - Click **New repository secret**.
   - Create a secret with:
     - **Name**: `DOCKERHUB_USERNAME`
     - **Value**: `tienlx93`
   - Click **Add secret**.
   - Click **New repository secret** again.
     - **Name**: `DOCKERHUB_TOKEN`
     - **Value**: *The Docker Hub access token you generated earlier*
   - Click **Add secret**.

---

### Step 3.2: Configure Google Cloud Credentials

Since you deploy using Cloud Run (with `gcloud` installed), you will need a GCP Service Account key to allow GitHub Actions to deploy to Cloud Run.

1. **Create a Service Account**:
   Open your terminal (with `gcloud` installed) or use the Google Cloud Console, and run:
   ```sh
   # Create a Service Account for GitHub Actions
   gcloud iam service-accounts create github-deployer \
     --description="Service account for GitHub Actions deployment to Cloud Run" \
     --display-name="GitHub Deployer"
   ```

2. **Grant Necessary Roles**:
   Grant the Service Account the roles required to deploy to Cloud Run (for project `my-it-tools`):
   ```sh
   PROJECT_ID="my-it-tools"
   
   # Grant Cloud Run Developer role
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.developer"
     
   # Grant Service Account User role (necessary to associate service accounts with services)
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

3. **Generate the Service Account JSON Key**:
   ```sh
   gcloud iam service-accounts keys create gcp-key.json \
     --iam-account="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
   ```

4. **Add Google Cloud secrets to GitHub**:
   Use the CLI to push them (see Step 3.3) or create the secrets manually:
   - `GCP_PROJECT_ID`: `my-it-tools`
   - `GCP_SA_KEY`: Copy the entire content of the `gcp-key.json` file.
   - `GCP_SERVICE_NAME`: `it-tools`
   - `GCP_REGION`: `asia-southeast1`

---

### Step 3.3: Push Secrets to GitHub via GitHub CLI (`gh`)

You can populate the values in the `.env` file at the project root and then push all of them to GitHub repository secrets in one go:

1. Open your `.env` file and fill in the missing variable (`GCP_SA_KEY`):
   ```env
   DOCKERHUB_USERNAME=tienlx93
   DOCKERHUB_TOKEN=<pat-token>
   GCP_PROJECT_ID=my-it-tools
   GCP_SA_KEY={"type": "service_account", ...} # Paste full JSON key here as a single line
   GCP_SERVICE_NAME=it-tools
   GCP_REGION=asia-southeast1
   ```

2. Push the service account key to GitHub using the `gh` CLI:
   ```sh
   gh secret set GCP_SA_KEY < gcp-key.json
   ```

   *Alternatively, if you are using PowerShell on Windows, you can read the `.env` file and push all secrets using the following script:*
   ```powershell
   # Read .env and set all non-empty values as GitHub secrets
   Get-Content .env | ForEach-Object {
       if ($_ -match '^([^#\s=]+)=(.*)$') {
           $name = $Matches[1]
           $value = $Matches[2].Trim()
           if ($value) {
               gh secret set $name --body $value
           }
       }
   }
   ```

---

### Step 3.4: Configure GitHub Actions Workflow Permissions (for `GITHUB_TOKEN`)

The workflow needs write permissions to push to GitHub Container Registry (GHCR) and to create releases/tags.

1. Go to your GitHub repository.
2. Navigate to **Settings** -> **Actions** -> **General** in the left sidebar.
3. Scroll down to the **Workflow permissions** section.
4. Select **Read and write permissions**.
5. *(Optional)* Check **Allow GitHub Actions to create and approve pull requests** if needed.
6. Click **Save**.

---

## 4. Forking & Customization Considerations

> [!WARNING]
> The GitHub Actions workflows in this project contain hardcoded repository owners and image namespaces (`tienlx93`) in some configurations. If you run these workflows under your own GitHub account or Docker Hub organization, they will fail to push unless you modify the workflow configurations.

### Updating Docker Tags

If you are running this workflow in a fork or private copy, you must update the image namespaces in the following files:

1. **[.github/workflows/docker-nightly-release.yml](file:///D:/Working/my-it-tools/.github/workflows/docker-nightly-release.yml)** (lines 86-87):
   ```yaml
   tags: |
     YOUR_DOCKERHUB_USERNAME/my-it-tools:nightly
     ghcr.io/YOUR_GITHUB_USERNAME/my-it-tools:nightly
   ```

2. **[.github/workflows/releases.yml](file:///D:/Working/my-it-tools/.github/workflows/releases.yml)** (lines 45-48):
   ```yaml
   tags: |
     YOUR_DOCKERHUB_USERNAME/my-it-tools:latest
     YOUR_DOCKERHUB_USERNAME/my-it-tools:${{ env.RELEASE_VERSION }}
     ghcr.io/YOUR_GITHUB_USERNAME/my-it-tools:latest
     ghcr.io/YOUR_GITHUB_USERNAME/my-it-tools:${{ env.RELEASE_VERSION}}
   ```
