#!/bin/bash
# Run this from the backend/ directory

echo "=== Clinic Backend Setup ==="

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install packages
pip install -r requirements.txt

# 3. Generate .env if it doesn't exist
if [ ! -f .env ]; then
  FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(50))")
  cat > .env << EOF
SECRET_KEY=$SECRET_KEY
DEBUG=True
FERNET_KEY=$FERNET_KEY
ADMIN_SPECIAL_CODE=CLINIC2024
EOF
  echo ".env created with generated keys."
fi

# 4. Migrations
python manage.py makemigrations accounts appointments records messaging notifications
python manage.py migrate

# 5. Create superuser (admin)
echo "Creating admin user..."
python manage.py shell -c "
from accounts.models import CustomUser
if not CustomUser.objects.filter(username='admin').exists():
    u = CustomUser.objects.create_superuser('admin', 'admin@clinic.com', 'admin123')
    u.role = 'admin'
    u.first_name = 'System'
    u.last_name = 'Admin'
    u.save()
    print('Admin created: username=admin, password=admin123')
else:
    print('Admin already exists.')
"

# 6. Create sample doctor
python manage.py shell -c "
from accounts.models import CustomUser, DoctorProfile
if not CustomUser.objects.filter(username='doctor1').exists():
    u = CustomUser.objects.create_user('doctor1', 'doctor1@clinic.com', 'doctor123')
    u.role = 'doctor'
    u.first_name = 'Maria'
    u.last_name = 'Santos'
    u.save()
    DoctorProfile.objects.create(user=u, specialization='General Medicine')
    print('Doctor created: username=doctor1, password=doctor123')
"

# 7. Create sample patient
python manage.py shell -c "
from accounts.models import CustomUser, PatientProfile
if not CustomUser.objects.filter(username='patient1').exists():
    u = CustomUser.objects.create_user('patient1', 'patient1@clinic.com', 'patient123')
    u.role = 'patient'
    u.first_name = 'Juan'
    u.last_name = 'Dela Cruz'
    u.save()
    PatientProfile.objects.create(user=u)
    print('Patient created: username=patient1, password=patient123')
"

echo ""
echo "=== Setup complete! ==="
echo "Start server: daphne -b 0.0.0.0 -p 8000 clinic.asgi:application"
