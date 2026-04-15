# Prompt to paste when starting Claude Code

Read CONTEXT.md first, then do the following in order:

1. SSH into root@49.12.73.66 (key at C:\Users\gonja\.ssh\id_rsa)

2. Upload backend files to /opt/careers/:
   - backend/main.py
   - backend/seed.py
   - backend/.env.example → rename to .env and ask me to fill in OPENAI_API_KEY and RECRUITER_PASSWORD

3. Test backend:
   cd /opt/careers
   source venv/bin/activate
   python -c "from main import app; print('OK')"

4. Set up the React frontend with Vite:
   - Install Node if not present
   - Create Vite project at /opt/careers/frontend
   - Copy laminar-jobs-v3.jsx as src/App.jsx
   - Wire the API calls (replace mock data with fetch calls to /api/*)
   - npm run build → output to /opt/careers/frontend/dist

5. Configure Nginx:
   - Copy nginx/careers.conf to /etc/nginx/sites-available/careers
   - ln -s /etc/nginx/sites-available/careers /etc/nginx/sites-enabled/careers
   - nginx -t && systemctl reload nginx

6. Set up systemd:
   - Copy careers.service to /etc/systemd/system/careers.service
   - systemctl daemon-reload
   - systemctl enable careers
   - systemctl start careers
   - systemctl status careers

7. SSL:
   certbot --nginx -d careers.laminarpay.com

8. Seed the DB:
   cd /opt/careers && python seed.py

9. Test end to end:
   - Hit https://careers.laminarpay.com — job board should load
   - Apply to a job — check /mnt/cvs for uploaded CV
   - Hit /api/applicants with Basic Auth — should return the applicant

10. Remaining TODOs to flag when done:
    - CV text extraction (pdfminer or pypdf2) for OpenAI parsing
    - Rejection email SMTP (ask Gonzalo which provider)
    - Frontend: replace in-memory state with API calls for recruiter dashboard
