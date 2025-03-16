// Firebase 모듈 import
import { auth, db, doc, getDoc, updateDoc } from '../firebase-config.js';

// 이미지 첨부 기능 초기화
export function initializeImageAttachment(currentPatientId, currentRegisterDate) {
    // 요소 참조
    const attachImageBtn = document.querySelector('.attach-image-btn');
    const imageContainer = document.querySelector('.prescription-right-top-area');
    
    // 요소가 없으면 초기화 중단
    if (!attachImageBtn) {
        console.error('Image attachment button not found');
        return createDummyManager();
    }
    
    if (!imageContainer) {
        console.error('Image container not found');
        return createDummyManager();
    }
    
    // 기존 파일 입력 요소 제거 (중복 방지)
    const oldFileInput = document.querySelector('#image-file-input');
    if (oldFileInput) {
        oldFileInput.remove();
    }
    
    // 기존 썸네일 컨테이너 제거 (중복 방지)
    const oldThumbnailContainer = imageContainer.querySelector('.image-thumbnail-container');
    if (oldThumbnailContainer) {
        oldThumbnailContainer.remove();
    }
    
    // 새 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'image-file-input';
    fileInput.accept = '.jpg, .jpeg, .png';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 새 썸네일 컨테이너 생성
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'image-thumbnail-container';
    thumbnailContainer.style.position = 'absolute';
    thumbnailContainer.style.top = '40px';
    thumbnailContainer.style.left = '10px';
    thumbnailContainer.style.width = 'calc(100% - 20px)';
    thumbnailContainer.style.height = 'calc(100% - 50px)';
    thumbnailContainer.style.display = 'flex';
    thumbnailContainer.style.justifyContent = 'center';
    thumbnailContainer.style.alignItems = 'center';
    thumbnailContainer.style.overflow = 'hidden';
    thumbnailContainer.style.backgroundColor = '#f5f5f5';
    thumbnailContainer.style.borderRadius = '4px';
    thumbnailContainer.style.border = '1px solid #ccc';
    thumbnailContainer.innerHTML = '<div style="text-align: center; color: #666;"></div>';
    
    // 안전하게 컨테이너에 추가
    try {
        imageContainer.appendChild(thumbnailContainer);
    } catch (error) {
        console.error('Error appending thumbnail container:', error);
        return createDummyManager();
    }

    // 이미지 탐색을 위한 상태 변수
    let tempImages = []; // 임시 저장용 이미지 배열
    let currentImages = []; // 현재 표시용 이미지 배열
    let currentImageIndex = 0;
    
    // 이미지 페이지네이션 표시 요소 생성
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'image-pagination-info';
    paginationInfo.style.position = 'absolute';
    paginationInfo.style.top = '10px';
    paginationInfo.style.left = '10px';
    paginationInfo.style.background = 'rgba(0, 0, 0, 0.5)';
    paginationInfo.style.color = 'white';
    paginationInfo.style.padding = '5px 10px';
    paginationInfo.style.borderRadius = '4px';
    paginationInfo.style.fontSize = '12px';
    paginationInfo.style.zIndex = '1';
    paginationInfo.style.display = 'none'; // 초기에는 숨김
    thumbnailContainer.appendChild(paginationInfo);
    
    // 이전 이미지 버튼
    const prevButton = document.createElement('div');
    prevButton.className = 'image-nav-btn prev-btn';
    prevButton.innerHTML = '&lt;';
    prevButton.style.position = 'absolute';
    prevButton.style.left = '10px';
    prevButton.style.top = '50%';
    prevButton.style.transform = 'translateY(-50%)';
    prevButton.style.background = 'rgba(0, 0, 0, 0.5)';
    prevButton.style.color = 'white';
    prevButton.style.width = '30px';
    prevButton.style.height = '30px';
    prevButton.style.borderRadius = '50%';
    prevButton.style.display = 'flex';
    prevButton.style.justifyContent = 'center';
    prevButton.style.alignItems = 'center';
    prevButton.style.cursor = 'pointer';
    prevButton.style.zIndex = '2';
    prevButton.style.display = 'none'; // 초기에는 숨김
    thumbnailContainer.appendChild(prevButton);
    
    // 다음 이미지 버튼
    const nextButton = document.createElement('div');
    nextButton.className = 'image-nav-btn next-btn';
    nextButton.innerHTML = '&gt;';
    nextButton.style.position = 'absolute';
    nextButton.style.right = '10px';
    nextButton.style.top = '50%';
    nextButton.style.transform = 'translateY(-50%)';
    nextButton.style.background = 'rgba(0, 0, 0, 0.5)';
    nextButton.style.color = 'white';
    nextButton.style.width = '30px';
    nextButton.style.height = '30px';
    nextButton.style.borderRadius = '50%';
    nextButton.style.display = 'flex';
    nextButton.style.justifyContent = 'center';
    nextButton.style.alignItems = 'center';
    nextButton.style.cursor = 'pointer';
    nextButton.style.zIndex = '2';
    nextButton.style.display = 'none'; // 초기에는 숨김
    thumbnailContainer.appendChild(nextButton);
    
    // 이전 이미지 버튼 클릭 이벤트
    prevButton.onclick = (e) => {
        e.stopPropagation(); // 버블링 방지
        if (currentImageIndex > 0) {
            currentImageIndex--;
            displayImageAtIndex();
        }
    };
    
    // 다음 이미지 버튼 클릭 이벤트
    nextButton.onclick = (e) => {
        e.stopPropagation(); // 버블링 방지
        if (currentImageIndex < currentImages.length - 1) {
            currentImageIndex++;
            displayImageAtIndex();
        }
    };

    // 현재 인덱스의 이미지 표시 함수
    function displayImageAtIndex() {
        if (currentImages.length === 0) {
            // 컨테이너 내용 모두 제거
            while (thumbnailContainer.firstChild) {
                thumbnailContainer.removeChild(thumbnailContainer.firstChild);
            }
            
            // 빈 메시지 추가
            const noImageDiv = document.createElement('div');
            noImageDiv.style.textAlign = 'center';
            noImageDiv.style.color = '#666';
            noImageDiv.textContent = '';
            thumbnailContainer.appendChild(noImageDiv);
            
            // 버튼 및 페이지네이션 다시 추가
            thumbnailContainer.appendChild(paginationInfo);
            thumbnailContainer.appendChild(prevButton);
            thumbnailContainer.appendChild(nextButton);
            
            // 네비게이션 버튼과 페이지네이션 숨기기
            paginationInfo.style.display = 'none';
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
            return;
        }
        
        // 컨테이너 내용 모두 제거 (로딩 메시지 포함)
        while (thumbnailContainer.firstChild) {
            thumbnailContainer.removeChild(thumbnailContainer.firstChild);
        }
        
        // 이미지 생성 및 표시
        const img = document.createElement('img');
        img.src = currentImages[currentImageIndex];
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.zIndex = '0';
        thumbnailContainer.appendChild(img);
        
        // 버튼 및 페이지네이션 다시 추가
        thumbnailContainer.appendChild(paginationInfo);
        thumbnailContainer.appendChild(prevButton);
        thumbnailContainer.appendChild(nextButton);
        
        // 페이지네이션 정보 업데이트
        paginationInfo.textContent = `${currentImageIndex + 1}/${currentImages.length}`;
        paginationInfo.style.display = 'block';
        
        // 네비게이션 버튼 표시/숨김 처리
        prevButton.style.display = currentImageIndex > 0 ? 'flex' : 'none';
        nextButton.style.display = currentImageIndex < currentImages.length - 1 ? 'flex' : 'none';
        
        // 이미지 클릭 시 원본 크기로 표시
        img.onclick = (e) => {
            e.stopPropagation(); // 네비게이션 버튼 클릭과 구분하기 위함
            openImageModal(currentImages[currentImageIndex], currentImageIndex, currentImages.length);
        };
    }
    
    // 이벤트 리스너 - 클릭
    attachImageBtn.onclick = () => {
        if (!attachImageBtn.disabled) {
            fileInput.click();
        }
    };
    
    // 이벤트 리스너 - 파일 선택
    fileInput.onchange = async (e) => {
        if (!e.target.files.length) return;
        
        const file = e.target.files[0];
        const fileType = file.type;
        
        // 파일 유형 확인
        if (!fileType.match('image/jpeg') && !fileType.match('image/png')) {
            alert('Only JPG, JPEG and PNG files are allowed');
            return;
        }
        
        try {
            if (!currentPatientId || !currentRegisterDate) {
                alert('Please select a patient first');
                return;
            }
            
            // 로딩 표시
            const existingImg = thumbnailContainer.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }
            
            // 기존 내용 모두 제거 (로딩 메시지가 표시될 영역 정리)
            while (thumbnailContainer.firstChild) {
                thumbnailContainer.removeChild(thumbnailContainer.firstChild);
            }
            
            const loadingDiv = document.createElement('div');
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.color = '#666';
            loadingDiv.textContent = 'Processing...';
            loadingDiv.id = 'image-loading-indicator'; // ID 추가하여 나중에 쉽게 찾을 수 있도록
            thumbnailContainer.appendChild(loadingDiv);
            
            // 버튼 및 페이지네이션 다시 추가
            thumbnailContainer.appendChild(paginationInfo);
            thumbnailContainer.appendChild(prevButton);
            thumbnailContainer.appendChild(nextButton);
            
            // 이미지를 Base64로 변환
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;
                
                try {
                    // 로딩 메시지 제거
                    const loadingElement = document.getElementById('image-loading-indicator');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                    
                    // 메모리에만 저장 (Save 버튼 클릭 시 서버에 저장)
                    tempImages.push(base64Image);
                    
                    // 현재 표시 이미지도 업데이트
                    currentImages = [...tempImages];
                    // 새로 추가된 이미지로 인덱스 이동
                    currentImageIndex = currentImages.length - 1;
                    
                    // 이미지 표시
                    displayImageAtIndex();
                    
                } catch (error) {
                    console.error('Image processing failed:', error);
                    if (thumbnailContainer.contains(loadingDiv)) {
                        loadingDiv.textContent = 'Processing failed';
                    }
                    alert('Failed to process image: ' + error.message);
                }
            };
            
            reader.onerror = (error) => {
                console.error('이미지 읽기 실패:', error);
                // 로딩 메시지를 오류 메시지로 변경
                if (thumbnailContainer.contains(loadingDiv)) {
                    loadingDiv.textContent = 'Processing failed';
                }
                alert('Failed to read image file');
            };
            
            // 파일을 Base64로 읽기
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Image processing failed:', error);
            // 오류 발생 시 썸네일 컨테이너 초기화
            while (thumbnailContainer.firstChild) {
                thumbnailContainer.removeChild(thumbnailContainer.firstChild);
            }
            
            const errorDiv = document.createElement('div');
            errorDiv.style.textAlign = 'center';
            errorDiv.style.color = '#666';
            errorDiv.textContent = 'Processing failed';
            thumbnailContainer.appendChild(errorDiv);
            
            // 버튼 및 페이지네이션 다시 추가
            thumbnailContainer.appendChild(paginationInfo);
            thumbnailContainer.appendChild(prevButton);
            thumbnailContainer.appendChild(nextButton);
            alert('Failed to process image: ' + error.message);
        }
        
        // 파일 입력 초기화
        fileInput.value = '';
    };
    
    // 이미지 모달 표시 함수
    function openImageModal(imageUrl, currentIndex, totalImages) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        // 모달 내 페이지네이션 표시
        const modalPagination = document.createElement('div');
        modalPagination.style.position = 'absolute';
        modalPagination.style.top = '20px';
        modalPagination.style.left = '20px';
        modalPagination.style.color = 'white';
        modalPagination.style.padding = '5px 10px';
        modalPagination.style.borderRadius = '4px';
        modalPagination.style.background = 'rgba(0, 0, 0, 0.5)';
        modalPagination.textContent = `${currentIndex + 1}/${totalImages}`;
        modal.appendChild(modalPagination);
        
        const modalImg = document.createElement('img');
        modalImg.src = imageUrl;
        modalImg.style.maxWidth = '90%';
        modalImg.style.maxHeight = '90%';
        modalImg.style.objectFit = 'contain';
        
        modal.appendChild(modalImg);
        document.body.appendChild(modal);
        
        // 모달 클릭 시 닫기
        modal.onclick = () => {
            document.body.removeChild(modal);
        };
    }
    
    // 버튼 초기 비활성화
    attachImageBtn.disabled = true;
    attachImageBtn.style.opacity = '0.5';
    attachImageBtn.style.cursor = 'not-allowed';
    
    // 반환 객체 - 이미지 관리 함수들
    const imageManager = {
        displayImages: (imageUrlsOrUrl) => {
            // 인자가 배열인지 확인
            if (Array.isArray(imageUrlsOrUrl)) {
                currentImages = [...imageUrlsOrUrl];
                tempImages = [...imageUrlsOrUrl]; // 기존 저장된 이미지도 임시 배열에 저장
            } else if (imageUrlsOrUrl) {
                // 단일 URL이면 배열로 변환
                currentImages = [imageUrlsOrUrl];
                tempImages = [imageUrlsOrUrl];
            } else {
                currentImages = [];
                tempImages = [];
            }
            
            currentImageIndex = 0; // 첫 번째 이미지부터 표시
            displayImageAtIndex();
        },
        resetImage: () => {
            currentImages = [];
            tempImages = [];
            currentImageIndex = 0;
            displayImageAtIndex();
        },
        enableAttachButton: () => {
            attachImageBtn.disabled = false;
            attachImageBtn.style.opacity = '1';
            attachImageBtn.style.cursor = 'pointer';
            
            // 썸네일 컨테이너 배경색을 흰색으로 변경
            thumbnailContainer.style.backgroundColor = '#fff';
        },
        disableAttachButton: () => {
            attachImageBtn.disabled = true;
            attachImageBtn.style.opacity = '0.5';
            attachImageBtn.style.cursor = 'not-allowed';
            
            // 썸네일 컨테이너 배경색을 원래대로 복원
            thumbnailContainer.style.backgroundColor = '#f5f5f5';
        },
        getTemporaryImages: () => {
            return tempImages.length > 0 ? [...tempImages] : null;
        }
    };
    
    // 관리자 객체를 전역 변수에 저장
    window.imageManager = imageManager;
    
    return imageManager;
}

// 오류 발생 시 기본 이미지 관리자 객체 생성
function createDummyManager() {
    return {
        displayImages: () => console.warn('Cannot display images: image container not initialized'),
        resetImage: () => {},
        enableAttachButton: () => {},
        disableAttachButton: () => {},
        getTemporaryImages: () => null
    };
}

// 저장된 이미지 로드 함수
export async function loadPatientImage(patientId, registerDate) {
    if (!patientId || !registerDate) return null;
    
    try {
        const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
        const prescriptionRef = doc(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date', registerDate);
        const prescriptionDoc = await getDoc(prescriptionRef);
        
        if (prescriptionDoc.exists()) {
            const data = prescriptionDoc.data();
            return data.pictureImage || null;
        }
    } catch (error) {
        console.error('Failed to load patient image:', error);
    }
    
    return null;
}
