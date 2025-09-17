// ResumeAI - Smart Resume Shortlisting System
class ResumeAI {
    constructor() {
        this.uploadedFiles = [];
        this.jobDescription = '';
        this.rankedCandidates = [];
        this.isProcessing = false;
        
        this.initializeEventListeners();
        this.initializeDragAndDrop();
    }

    initializeEventListeners() {
        // Job description
        document.getElementById('jobDescription').addEventListener('input', (e) => {
            this.jobDescription = e.target.value;
        });

        document.getElementById('clearJob').addEventListener('click', () => {
            document.getElementById('jobDescription').value = '';
            this.jobDescription = '';
        });

        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Results actions
        document.getElementById('exportResults').addEventListener('click', () => {
            this.exportResults();
        });

        document.getElementById('newAnalysis').addEventListener('click', () => {
            this.resetAnalysis();
        });

        // Modal
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.closeModal();
            }
        });
    }

    initializeDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    handleFileSelect(files) {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        Array.from(files).forEach(file => {
            if (validTypes.includes(file.type)) {
                if (!this.uploadedFiles.find(f => f.name === file.name)) {
                    this.uploadedFiles.push(file);
                }
            } else {
                this.showNotification(`File ${file.name} is not supported. Please upload PDF, DOC, or DOCX files.`, 'error');
            }
        });

        this.updateFileList();
        this.startAnalysis();
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const isBulk = this.isBulkResumeFile(file);
            const estimatedResumes = isBulk ? this.detectNumberOfResumes(file) : 1;
            const fileType = isBulk ? 'Bulk File' : 'Individual Resume';
            const icon = isBulk ? 'fas fa-layer-group' : 'fas fa-file-pdf';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)} • ${fileType}</p>
                        ${isBulk ? `<p class="bulk-info"><i class="fas fa-users"></i> Estimated ${estimatedResumes} resumes</p>` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-remove" onclick="resumeAI.removeFile(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateFileList();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async startAnalysis() {
        if (this.uploadedFiles.length === 0) {
            this.showNotification('Please upload at least one resume file.', 'warning');
            return;
        }

        if (!this.jobDescription.trim()) {
            this.showNotification('Please enter job requirements before analyzing resumes.', 'warning');
            return;
        }

        this.isProcessing = true;
        this.showProcessingSection();
        
        try {
            // Simulate file processing and AI analysis
            const candidates = await this.processResumes();
            this.rankedCandidates = this.rankCandidates(candidates);
            this.displayResults();
        } catch (error) {
            this.showNotification('Error processing resumes. Please try again.', 'error');
            console.error('Processing error:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    showProcessingSection() {
        document.getElementById('processingSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        
        this.animateProgress();
    }

    animateProgress() {
        const progressFill = document.getElementById('progressFill');
        const statusText = document.getElementById('processingStatus');
        
        const hasBulkFiles = this.uploadedFiles.some(file => this.isBulkResumeFile(file));
        const totalResumes = this.uploadedFiles.reduce((total, file) => {
            return total + (this.isBulkResumeFile(file) ? this.detectNumberOfResumes(file) : 1);
        }, 0);
        
        const steps = [
            { progress: 20, text: hasBulkFiles ? 'Reading bulk files and individual resumes...' : 'Reading resume files...' },
            { progress: 40, text: `Extracting content from ${totalResumes} resumes...` },
            { progress: 60, text: 'Analyzing skills and experience...' },
            { progress: 80, text: 'Matching against job requirements...' },
            { progress: 100, text: 'Generating rankings...' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                progressFill.style.width = steps[currentStep].progress + '%';
                statusText.textContent = steps[currentStep].text;
                currentStep++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById('processingSection').style.display = 'none';
                }, 500);
            }
        }, 800);
    }

    async processResumes() {
        // Process resumes - supports both individual files and bulk files
        const candidates = [];
        
        for (let i = 0; i < this.uploadedFiles.length; i++) {
            const file = this.uploadedFiles[i];
            
            // Check if this is a bulk resume file
            if (this.isBulkResumeFile(file)) {
                const bulkCandidates = await this.processBulkResumeFile(file, candidates.length);
                candidates.push(...bulkCandidates);
            } else {
                // Process individual resume file
                const candidate = this.generateMockCandidateData(file.name, candidates.length);
                candidates.push(candidate);
            }
        }

        return candidates;
    }

    isBulkResumeFile(file) {
        // Check if file contains multiple resumes based on name or content
        const bulkKeywords = ['bulk', 'multiple', 'batch', 'resumes', 'candidates'];
        const fileName = file.name.toLowerCase();
        
        return bulkKeywords.some(keyword => fileName.includes(keyword)) || 
               file.size > 500000; // Files larger than 500KB might contain multiple resumes
    }

    async processBulkResumeFile(file, startIndex) {
        // Simulate processing a bulk file containing multiple resumes
        const candidates = [];
        const numResumes = this.detectNumberOfResumes(file);
        
        for (let i = 0; i < numResumes; i++) {
            const candidate = this.generateMockCandidateData(
                `Resume_${startIndex + i + 1}_from_${file.name}`, 
                startIndex + i
            );
            candidates.push(candidate);
        }

        return candidates;
    }

    detectNumberOfResumes(file) {
        // Simulate detecting number of resumes in bulk file
        // In a real application, this would parse the file content
        
        // For demo purposes, return different numbers based on file size
        if (file.size < 100000) return 5;      // Small file: 5 resumes
        if (file.size < 500000) return 10;     // Medium file: 10 resumes  
        if (file.size < 1000000) return 20;    // Large file: 20 resumes
        return 50; // Very large file: 50 resumes
    }

    generateMockCandidateData(fileName, index) {
        const names = [
            'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Lisa Thompson',
            'James Wilson', 'Maria Garcia', 'Robert Brown', 'Jennifer Davis', 'Christopher Lee',
            'Amanda Taylor', 'Daniel Martinez', 'Jessica Anderson', 'Matthew Thomas', 'Ashley Jackson',
            'Andrew White', 'Stephanie Harris', 'Kevin Martin', 'Nicole Thompson', 'Ryan Garcia'
        ];

        const skills = [
            'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git',
            'Machine Learning', 'Data Analysis', 'Project Management', 'Agile', 'Scrum',
            'UI/UX Design', 'Figma', 'Photoshop', 'Marketing', 'Sales', 'Customer Service',
            'Communication', 'Leadership', 'Problem Solving', 'Team Management', 'Analytics'
        ];

        const experiences = [
            'Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer', 'Marketing Manager',
            'Sales Representative', 'Business Analyst', 'DevOps Engineer', 'Frontend Developer',
            'Backend Developer', 'Full Stack Developer', 'Project Manager', 'HR Specialist',
            'Financial Analyst', 'Operations Manager', 'Content Writer', 'Graphic Designer'
        ];

        const companies = [
            'Google', 'Microsoft', 'Amazon', 'Apple', 'Facebook', 'Netflix', 'Uber', 'Airbnb',
            'Tesla', 'SpaceX', 'IBM', 'Oracle', 'Salesforce', 'Adobe', 'Intel', 'NVIDIA',
            'Spotify', 'Twitter', 'LinkedIn', 'Pinterest', 'Slack', 'Zoom', 'Shopify', 'Stripe'
        ];

        const name = names[index % names.length];
        const experience = experiences[Math.floor(Math.random() * experiences.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const yearsExp = Math.floor(Math.random() * 10) + 1;
        
        // Generate random skills
        const candidateSkills = [];
        const numSkills = Math.floor(Math.random() * 8) + 5;
        for (let i = 0; i < numSkills; i++) {
            const skill = skills[Math.floor(Math.random() * skills.length)];
            if (!candidateSkills.includes(skill)) {
                candidateSkills.push(skill);
            }
        }

        return {
            id: index + 1,
            name: name,
            email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
            phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
            experience: experience,
            company: company,
            yearsExperience: yearsExp,
            skills: candidateSkills,
            education: 'Bachelor\'s Degree in Computer Science',
            location: 'San Francisco, CA',
            fileName: fileName,
            summary: `Experienced ${experience} with ${yearsExp} years of expertise in ${candidateSkills.slice(0, 3).join(', ')}. Proven track record at ${company} with strong analytical and problem-solving skills.`
        };
    }

    rankCandidates(candidates) {
        const jobKeywords = this.extractKeywords(this.jobDescription.toLowerCase());
        
        return candidates.map(candidate => {
            let score = 0;
            const matchedSkills = [];
            
            // Skill matching (40% of score)
            candidate.skills.forEach(skill => {
                if (jobKeywords.some(keyword => 
                    skill.toLowerCase().includes(keyword) || 
                    keyword.includes(skill.toLowerCase())
                )) {
                    score += 8;
                    matchedSkills.push(skill);
                }
            });

            // Experience level matching (25% of score)
            const experienceKeywords = ['senior', 'lead', 'principal', 'manager', 'director'];
            const hasSeniorRole = experienceKeywords.some(keyword => 
                candidate.experience.toLowerCase().includes(keyword) ||
                jobKeywords.includes(keyword)
            );
            if (hasSeniorRole && candidate.yearsExperience >= 5) {
                score += 10;
            } else if (candidate.yearsExperience >= 3) {
                score += 6;
            } else {
                score += 3;
            }

            // Education matching (15% of score)
            const educationKeywords = ['degree', 'bachelor', 'master', 'phd', 'university', 'college'];
            if (educationKeywords.some(keyword => 
                candidate.education.toLowerCase().includes(keyword) ||
                jobKeywords.includes(keyword)
            )) {
                score += 6;
            }

            // Company prestige (10% of score)
            const topCompanies = ['google', 'microsoft', 'amazon', 'apple', 'facebook', 'netflix'];
            if (topCompanies.includes(candidate.company.toLowerCase())) {
                score += 5;
            }

            // Location matching (5% of score)
            const locationKeywords = ['remote', 'san francisco', 'new york', 'seattle', 'austin'];
            if (locationKeywords.some(keyword => 
                candidate.location.toLowerCase().includes(keyword) ||
                jobKeywords.includes(keyword)
            )) {
                score += 3;
            }

            // Random factor for realistic variation (5% of score)
            score += Math.random() * 5;

            return {
                ...candidate,
                score: Math.min(Math.round(score), 100),
                matchedSkills: matchedSkills,
                ranking: 0 // Will be set after sorting
            };
        }).sort((a, b) => b.score - a.score)
        .map((candidate, index) => ({
            ...candidate,
            ranking: index + 1
        }));
    }

    extractKeywords(text) {
        const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
        
        return text.split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.includes(word.toLowerCase()))
            .map(word => word.toLowerCase().replace(/[^\w]/g, ''));
    }

    displayResults() {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        const totalResumes = document.getElementById('totalResumes');
        const topCandidates = document.getElementById('topCandidates');

        resultsSection.style.display = 'block';
        resultsGrid.innerHTML = '';

        const displayCount = Math.min(this.rankedCandidates.length, 20);
        totalResumes.textContent = `${this.rankedCandidates.length} resumes processed`;
        topCandidates.textContent = `Top ${displayCount} candidates shown`;

        for (let i = 0; i < displayCount; i++) {
            const candidate = this.rankedCandidates[i];
            const candidateCard = this.createCandidateCard(candidate);
            resultsGrid.appendChild(candidateCard);
        }
    }

    createCandidateCard(candidate) {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.onclick = () => this.showCandidateDetails(candidate);

        const skillsHtml = candidate.skills.map(skill => {
            const isMatched = candidate.matchedSkills.includes(skill);
            return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${skill}</span>`;
        }).join('');

        card.innerHTML = `
            <div class="candidate-header">
                <div class="candidate-rank">#${candidate.ranking}</div>
                <div class="candidate-score">${candidate.score}% Match</div>
            </div>
            <div class="candidate-info">
                <h3>${candidate.name}</h3>
                <p>${candidate.experience} • ${candidate.yearsExperience} years experience</p>
                <p><i class="fas fa-building"></i> ${candidate.company}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${candidate.location}</p>
            </div>
            <div class="candidate-skills">
                <strong>Skills:</strong>
                <div class="skills-list">
                    ${skillsHtml}
                </div>
            </div>
            <div class="candidate-summary">
                <p>${candidate.summary}</p>
            </div>
        `;

        return card;
    }

    showCandidateDetails(candidate) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `${candidate.name} - Detailed Profile`;

        const skillsHtml = candidate.skills.map(skill => {
            const isMatched = candidate.matchedSkills.includes(skill);
            return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${skill}</span>`;
        }).join('');

        modalBody.innerHTML = `
            <div style="display: grid; gap: 25px;">
                <div style="background: #f7fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 15px; color: #333;">Contact Information</h4>
                    <p><strong>Email:</strong> ${candidate.email}</p>
                    <p><strong>Phone:</strong> ${candidate.phone}</p>
                    <p><strong>Location:</strong> ${candidate.location}</p>
                </div>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 15px; color: #333;">Professional Experience</h4>
                    <p><strong>Current Role:</strong> ${candidate.experience}</p>
                    <p><strong>Company:</strong> ${candidate.company}</p>
                    <p><strong>Experience:</strong> ${candidate.yearsExperience} years</p>
                </div>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 15px; color: #333;">Education</h4>
                    <p>${candidate.education}</p>
                </div>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 15px; color: #333;">Skills & Technologies</h4>
                    <div class="skills-list">
                        ${skillsHtml}
                    </div>
                    <p style="margin-top: 15px; font-size: 0.9rem; color: #666;">
                        <i class="fas fa-check-circle" style="color: #38a169;"></i> 
                        ${candidate.matchedSkills.length} skills match job requirements
                    </p>
                </div>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 15px; color: #333;">AI Analysis Summary</h4>
                    <p>${candidate.summary}</p>
                    <div style="margin-top: 15px; padding: 15px; background: #e6fffa; border-radius: 8px; border-left: 4px solid #38a169;">
                        <p style="margin: 0; font-weight: 500; color: #234e52;">
                            <i class="fas fa-star"></i> Overall Match Score: ${candidate.score}%
                        </p>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('detailModal').style.display = 'none';
    }

    exportResults() {
        if (this.rankedCandidates.length === 0) {
            this.showNotification('No results to export.', 'warning');
            return;
        }

        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_rankings_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Results exported successfully!', 'success');
    }

    generateCSV() {
        const headers = ['Rank', 'Name', 'Email', 'Phone', 'Experience', 'Company', 'Years Exp', 'Location', 'Score', 'Matched Skills', 'Summary'];
        const rows = this.rankedCandidates.map(candidate => [
            candidate.ranking,
            candidate.name,
            candidate.email,
            candidate.phone,
            candidate.experience,
            candidate.company,
            candidate.yearsExperience,
            candidate.location,
            candidate.score,
            candidate.matchedSkills.join('; '),
            candidate.summary.replace(/,/g, ';')
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    resetAnalysis() {
        this.uploadedFiles = [];
        this.jobDescription = '';
        this.rankedCandidates = [];
        
        document.getElementById('jobDescription').value = '';
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('processingSection').style.display = 'none';
        
        this.showNotification('Analysis reset. Ready for new resumes!', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#fed7d7' : type === 'warning' ? '#fef5e7' : type === 'success' ? '#c6f6d5' : '#bee3f8'};
            color: ${type === 'error' ? '#c53030' : type === 'warning' ? '#d69e2e' : type === 'success' ? '#22543d' : '#2b6cb0'};
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            max-width: 400px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
let resumeAI;
document.addEventListener('DOMContentLoaded', () => {
    resumeAI = new ResumeAI();
    
    // Add some sample job description for demo
    document.getElementById('jobDescription').value = `Software Engineer - Full Stack Developer

We are looking for a talented Full Stack Developer to join our team. The ideal candidate should have:

Required Skills:
- JavaScript, React, Node.js
- Python, SQL, AWS
- Git, Docker
- 3+ years of experience
- Bachelor's degree in Computer Science or related field

Preferred Qualifications:
- Experience with machine learning
- Knowledge of agile methodologies
- Strong problem-solving skills
- Excellent communication skills

Location: San Francisco, CA (Remote work available)`;
    
    resumeAI.jobDescription = document.getElementById('jobDescription').value;
});

