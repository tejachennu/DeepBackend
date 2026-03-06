-- Add VolunteerTitle and VolunteerDescription to projects
ALTER TABLE projects 
ADD COLUMN VolunteerTitle VARCHAR(255) AFTER EndTime, 
ADD COLUMN VolunteerDescription TEXT AFTER VolunteerTitle;

-- Update ENUM in volunteer_form_fields to allow FILE
ALTER TABLE volunteer_form_fields 
MODIFY COLUMN FieldType ENUM('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'NUMBER', 'DATE', 'FILE') DEFAULT 'TEXT';
