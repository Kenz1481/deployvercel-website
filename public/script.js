document.addEventListener('DOMContentLoaded', () => {
    const projectListContainer = document.getElementById('project-list-container');
    const messageArea = document.getElementById('message-area-public');

    function displayMessage(message, type = 'success') {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.className = `message-area message-${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            if (messageArea) messageArea.style.display = 'none';
        }, 5000);
    }

    async function fetchProjects() {
        if (!projectListContainer) {
            console.error('Element #project-list-container not found.');
            return;
        }
        projectListContainer.innerHTML = '<p class="loading-text">Memuat proyek spektakuler...</p>';

        try {
            const response = await fetch('/api/projects');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const projects = await response.json();
            renderProjects(projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            projectListContainer.innerHTML = `<p class="loading-text message-error">Gagal memuat proyek: ${error.message}</p>`;
        }
    }

    function renderProjects(projects) {
        if (!projectListContainer) return;
        
        if (projects.length === 0) {
            projectListContainer.innerHTML = '<p class="loading-text">Belum ada proyek yang terdeploy saat ini.</p>';
            return;
        }

        projectListContainer.innerHTML = ''; 

        projects.forEach(project => {
            if (!project || !project._id) {
                console.warn('Project data is missing _id:', project);
                return; 
            }
            const projectId = project._id;

            const projectCard = document.createElement('article');
            projectCard.className = 'project-card';
            projectCard.dataset.projectId = projectId; 

            let projectIconClass = 'fa-rocket'; 
            if (project.projectName.toLowerCase().includes('bot')) projectIconClass = 'fa-robot';
            if (project.projectName.toLowerCase().includes('web') || project.projectName.toLowerCase().includes('site')) projectIconClass = 'fa-globe';
            if (project.projectName.toLowerCase().includes('api')) projectIconClass = 'fa-cogs';
            if (project.projectName.toLowerCase().includes('game')) projectIconClass = 'fa-gamepad';


            projectCard.innerHTML = `
                <div class="project-card-main-content"> 
                    <h3><i class="fas ${projectIconClass}"></i> ${project.projectName}</h3>
                    <p>${project.description || 'Tidak ada deskripsi untuk proyek ini.'}</p>
                    <p><strong>Status:</strong> <span class="status-${(project.status || 'unknown').toLowerCase().replace(/_/g, '-')}">${project.status || 'Unknown'}</span></p>
                    ${project.deploymentUrl ? `<p class="deployment-link"><strong><i class="fas fa-link"></i> URL:</strong> <a href="${project.deploymentUrl}" target="_blank" rel="noopener noreferrer">${project.deploymentUrl}</a></p>` : '<p>URL Deployment belum tersedia.</p>'}
                    <p><small><strong><i class="far fa-calendar-alt"></i> Diperbarui:</strong> ${new Date(project.updatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</small></p>
                </div>
                
                <div class="reviews-section">
                    <h4><i class="fas fa-star-half-alt"></i> Reviews</h4>
                    <div class="rating-stars">
                        ${renderStars(calculateAverageRating(project.reviews))}
                        <span style="font-size: 0.8em; color: var(--text-secondary); margin-left: 5px;">(${project.reviews.length} review)</span>
                    </div>
                    <div class="reviews-list" id="reviews-list-${projectId}">
                        ${project.reviews.length > 0 ? project.reviews.slice(0, 2).map(review => `
                            <div class="review-item">
                                <p class="reviewer">${review.reviewerName || 'Anonim'} (${renderStars(review.rating, true)})</p>
                                <p>${review.comment}</p> 
                            </div>
                        `).join('') : '<p style="font-size:0.9em; color: var(--text-secondary);">Belum ada review.</p>'}
                        ${project.reviews.length > 2 ? `<p style="font-size:0.8em; margin-top:5px;"><a href="#" class="view-all-reviews" data-project-id="${projectId}" onclick="alert('Fungsi lihat semua review belum diimplementasi untuk project ${projectId}'); return false;">Lihat semua review...</a></p>` : ''}
                    </div>
                    <form class="review-form" data-project-id="${projectId}">
                        <h5><i class="fas fa-edit"></i> Tambah Review Anda</h5>
                        <input type="text" name="reviewerName" placeholder="Nama Anda (opsional)">
                        <div class="rating-input-group">
                            <label>Rating:</label>
                            <div>
                            ${[5,4,3,2,1].map(r => `
                                <input type="radio" name="rating" value="${r}" id="rating-${projectId}-${r}" required>
                                <label for="rating-${projectId}-${r}" class="rating-label" title="${r} bintang"><i class="fas fa-star"></i></label>
                            `).join('')}
                            </div>
                        </div>
                        <textarea name="comment" placeholder="Tulis komentar Anda di sini..." required rows="3"></textarea>
                        <button type="submit" class="btn btn-secondary btn-sm"><i class="fas fa-paper-plane"></i> Kirim Review</button>
                    </form>
                </div>
            `;
            projectListContainer.appendChild(projectCard);

            const reviewForm = projectCard.querySelector('.review-form');
            if (reviewForm) {
                reviewForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const currentFormProjectId = e.target.dataset.projectId;
                    
                    if (!currentFormProjectId) {
                        displayMessage('Kesalahan: ID Proyek tidak ditemukan untuk form review.', 'error');
                        console.error('Error submitting review: Project ID is missing from form data attribute.');
                        return;
                    }

                    const formData = new FormData(e.target);
                    const reviewData = {
                        reviewerName: formData.get('reviewerName') || 'Anonim',
                        rating: formData.get('rating'),
                        comment: formData.get('comment')
                    };

                    if (!reviewData.rating) {
                        displayMessage('Rating wajib diisi.', 'error');
                        return;
                    }

                    try {
                        const response = await fetch(`/api/projects/${currentFormProjectId}/reviews`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(reviewData)
                        });
                        if (!response.ok) {
                            const errorResult = await response.json().catch(() => ({ message: 'Gagal mengirim review, respons tidak valid.' }));
                            throw new Error(errorResult.message || 'Gagal mengirim review');
                        }
                        displayMessage('Review Anda berhasil dikirim! Terima kasih.', 'success');
                        e.target.reset(); 
                        fetchProjects(); 
                    } catch (error) {
                        console.error('Error submitting review:', error);
                        displayMessage(`Gagal mengirim review: ${error.message}`, 'error');
                    }
                });
            }
        });
    }

    function calculateAverageRating(reviews) {
        if (!reviews || reviews.length === 0) return 0;
        const totalRating = reviews.reduce((acc, review) => acc + Number(review.rating), 0);
        return Math.round(totalRating / reviews.length);
    }

    function renderStars(rating, small = false) {
        let starsHtml = '';
        const maxStars = 5;
        const ratingNum = Number(rating);
        for (let i = 1; i <= maxStars; i++) {
            starsHtml += `<i class="fas fa-star ${i <= ratingNum ? '' : 'empty'}" ${small ? 'style="font-size:0.8em;"':''}></i>`;
        }
        return starsHtml;
    }

    fetchProjects();
});