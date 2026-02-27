# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

EchoHealth is a new project with no source code yet. The repository currently only contains Claude Code skill configurations.

## Installed Skills

The following skills are available via `skills-lock.json` (sourced from `ReScienceLab/opc-skills`):

- `archive` - Session archiving and knowledge persistence
- `banner-creator` - AI-generated banners and headers
- `domain-hunter` - Domain search and pricing
- `logo-creator` - AI-generated logos and icons
- `nanobanana` - Image generation via Google Gemini
- `producthunt` - Product Hunt data retrieval
- `reddit` - Reddit search and content retrieval
- `requesthunt` - User demand research from real feedback
- `seo-geo` - SEO and AI search engine optimization
- `twitter` - Twitter/X content retrieval

## Package Manager

Use `pnpm` (not npm or yarn).

## Deployment

Prefer Vercel for static web deployments.
