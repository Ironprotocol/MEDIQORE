// prescription_orderset.js - 처방전 즐겨찾기(Order set) 관련 기능

import { doc, setDoc, collection, getDocs, query, orderBy, getDoc } from '../firebase-config.js';

// Order set 즐겨찾기 기능 초기화
export function initializeOrderSet() {
    // 즐겨찾기 버튼 이벤트 리스너 등록
    const favoriteBtn = document.querySelector('.prescription-favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', openOrderSetModal);
    }

    // 모달 창 생성
    createOrderSetModal();
    
    // OrderSet 목록 및 내용 표시 영역 초기화
    initializeOrderSetBrowser();
}

// OrderSet 목록 및 내용 표시 영역 초기화
async function initializeOrderSetBrowser() {
    // OrderSet 목록 컨테이너 생성 (왼쪽 패널)
    const orderSetListContainer = document.createElement('div');
    orderSetListContainer.className = 'order-set-list-container';
    
    // OrderSet 내용 컨테이너 생성 (오른쪽 패널)
    const orderSetContentContainer = document.createElement('div');
    orderSetContentContainer.className = 'order-set-content-container';
    
    // OrderSet footer 영역 생성
    const orderSetFooter = document.createElement('div');
    orderSetFooter.className = 'order-set-footer';
    
    // Apply 버튼 추가
    const applyButton = document.createElement('button');
    applyButton.className = 'order-set-apply-btn';
    applyButton.textContent = 'Apply';
    
    // Apply 버튼에 클릭 이벤트 등록
    applyButton.addEventListener('click', async () => {
        try {
            // 처방전 활성화 상태 확인 (환자 선택 메시지가 없고 New Chart가 활성화된 상태)
            const patientSelectWrapper = document.querySelector('.patient-select-wrapper');
            const isActive = !patientSelectWrapper || patientSelectWrapper.style.display === 'none';
            
            // 처방전이 비활성화 상태이면 버튼도 비활성화
            if (!isActive) {
                return;
            }
            
            // 선택된 OrderSet 항목 확인
            const selectedItem = document.querySelector('.order-set-item.selected');
            if (!selectedItem) {
                alert('Please select an Order Set first.');
                return;
            }
            
            // 선택된 OrderSet의 ID 가져오기
            const orderSetId = selectedItem.getAttribute('data-order-set-id');
            
            // 현재 사용자 정보 가져오기
            const user = window.auth.currentUser;
            if (!user) {
                console.error('No user is signed in');
                return;
            }
            
            // 이메일에서 병원명 추출
            const userEmail = user.email;
            const hospitalName = userEmail.split('.')[0];
            
            // Firestore에서 선택된 OrderSet 데이터 가져오기
            const docRef = doc(window.db, `hospitals/${hospitalName}/staff/${userEmail}/OrderSet`, orderSetId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.error('Order Set not found');
                return;
            }
            
            const orderSetData = docSnap.data();
            
            // CC 항목 추가
            if (orderSetData.cc && orderSetData.cc.length > 0) {
                // 기존 CC 항목 추가 함수 참조
                const addCCFunc = window.addCCItem || window.initializeCCSearch?.addCCItem;
                
                if (typeof addCCFunc === 'function') {
                    // 기존 함수 사용
                    orderSetData.cc.forEach(cc => addCCFunc(cc));
                } else {
                    // 대체 구현: 직접 DOM에 CC 항목 추가
                    const ccContainer = document.querySelector('.cc-items-container');
                    if (ccContainer) {
                        orderSetData.cc.forEach(cc => {
                            const ccItem = document.createElement('div');
                            ccItem.className = 'cc-item';
                            ccItem.innerHTML = `
                                <img src="image/cc.png" alt="CC Icon">
                                <div class="cc-item-text">${cc}</div>
                                <div class="cc-item-remove">&times;</div>
                            `;
                            
                            // 삭제 버튼 이벤트 리스너
                            ccItem.querySelector('.cc-item-remove').addEventListener('click', function(event) {
                                event.stopPropagation();
                                ccItem.remove();
                            });
                            
                            ccContainer.appendChild(ccItem);
                        });
                    }
                }
            }
            
            // Medicines 항목 추가
            if (orderSetData.medicines && orderSetData.medicines.length > 0) {
                // 기존 Medicine 항목 추가 함수 참조
                const addMedicineFunc = window.addMedicineItem || window.initializeMedicineSearch?.addMedicineItem;
                
                if (typeof addMedicineFunc === 'function') {
                    // 기존 함수 사용
                    orderSetData.medicines.forEach(medicine => addMedicineFunc(medicine));
                } else {
                    // 대체 구현: 직접 DOM에 Medicine 항목 추가
                    const medicineContainer = document.querySelector('.medicine-items-container');
                    if (medicineContainer) {
                        orderSetData.medicines.forEach(medicine => {
                            // medicine이 문자열인 경우 (이전 형식)
                            const medicineText = typeof medicine === 'string' ? medicine : medicine.name;
                            
                            const medicineItem = document.createElement('div');
                            medicineItem.className = 'medicine-item';
                            medicineItem.innerHTML = `
                                <img src="image/medicine.png" alt="Medicine Icon">
                                <div class="medicine-item-text">${medicineText}</div>
                                <div class="medicine-controls">
                                    <div class="medicine-input-group">
                                        <input type="text" class="medicine-input dose-input" placeholder="Dose">
                                    </div>
                                    <div class="medicine-input-group">
                                        <input type="text" class="medicine-input frequency-input" placeholder="Time">
                                    </div>
                                    <div class="medicine-input-group">
                                        <input type="text" class="medicine-input duration-input" placeholder="Dura">
                                    </div>
                                </div>
                                <div class="medicine-item-remove">&times;</div>
                            `;
                            
                            // 삭제 버튼 이벤트 리스너
                            medicineItem.querySelector('.medicine-item-remove').addEventListener('click', function(event) {
                                event.stopPropagation();
                                medicineItem.remove();
                            });
                            
                            medicineContainer.appendChild(medicineItem);
                        });
                    }
                }
            }
            
            // Apply 성공 메시지
            alert(`Order Set "${orderSetId}" has been applied.`);
            
        } catch (error) {
            console.error('Error applying Order Set:', error);
            alert('Failed to apply Order Set. Please try again.');
        }
    });
    
    // 처방전 상태 변화 감지 및 버튼 상태 업데이트
    function updateApplyButtonState() {
        // 처방전 활성화 상태 확인
        // 1. 환자가 선택되었는지 확인 (patient-select-wrapper가 숨겨져 있는지)
        const patientSelectWrapper = document.querySelector('.patient-select-wrapper');
        const patientSelected = !patientSelectWrapper || patientSelectWrapper.style.display === 'none';
        
        // 2. 입력 필드가 활성화되어 있는지 확인 (New Chart 버튼이 클릭된 상태)
        const inputFields = document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input');
        const inputsEnabled = inputFields.length > 0 && Array.from(inputFields).some(field => !field.disabled);
        
        // 두 조건이 모두 충족되어야 처방전이 활성화된 상태
        const isActive = patientSelected && inputsEnabled;
        
        // 버튼 상태 업데이트
        if (isActive) {
            applyButton.disabled = false;
            applyButton.classList.remove('disabled');
        } else {
            applyButton.disabled = true;
            applyButton.classList.add('disabled');
        }
    }
    
    // 초기 버튼 상태 설정 및 MutationObserver로 변화 감지
    updateApplyButtonState();
    
    // 입력 필드의 disabled 속성 변화도 감지
    const observerConfig = { attributes: true, attributeFilter: ['disabled', 'style'] };
    const inputFieldsToObserve = document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input');
    
    inputFieldsToObserve.forEach(field => {
        const observer = new MutationObserver(updateApplyButtonState);
        observer.observe(field, observerConfig);
    });
    
    // MutationObserver 설정
    const patientSelectObserver = new MutationObserver(updateApplyButtonState);
    
    // 환자 선택 메시지 요소 감시
    const patientSelectWrapper = document.querySelector('.patient-select-wrapper');
    if (patientSelectWrapper) {
        patientSelectObserver.observe(patientSelectWrapper, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
    }
    
    orderSetFooter.appendChild(applyButton);
    
    // 컨테이너를 prescription-right-bottom-area에 추가
    const rightBottomArea = document.querySelector('.prescription-right-bottom-area');
    if (rightBottomArea) {
        // 기존 검색창 찾기
        const searchInput = document.querySelector('.order-set-search-input');
        
        // 드롭다운 컨테이너 생성
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'order-set-search-dropdown';
        dropdownContainer.style.display = 'none';
        dropdownContainer.style.position = 'absolute';
        dropdownContainer.style.zIndex = '1001';
        dropdownContainer.style.maxHeight = '200px';
        dropdownContainer.style.overflowY = 'auto';
        dropdownContainer.style.backgroundColor = 'white';
        dropdownContainer.style.border = '1px solid #ddd';
        dropdownContainer.style.borderRadius = '4px';
        dropdownContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        
        // 드롭다운 위치 설정
        const searchRect = searchInput.getBoundingClientRect();
        const rightBottomRect = rightBottomArea.getBoundingClientRect();
        dropdownContainer.style.top = (searchRect.bottom - rightBottomRect.top + 2) + 'px';
        dropdownContainer.style.left = (searchRect.left - rightBottomRect.left) + 'px';
        dropdownContainer.style.width = searchInput.offsetWidth + 'px';
        
        // 드롭다운을 right-bottom-area에 추가
        rightBottomArea.appendChild(dropdownContainer);
        
        // 검색창에 이벤트 리스너 등록
        searchInput.addEventListener('input', function(event) {
            // 드롭다운 위치 업데이트
            const updatedSearchRect = searchInput.getBoundingClientRect();
            const updatedRightBottomRect = rightBottomArea.getBoundingClientRect();
            dropdownContainer.style.top = (updatedSearchRect.bottom - updatedRightBottomRect.top + 2) + 'px';
            dropdownContainer.style.left = (updatedSearchRect.left - updatedRightBottomRect.left) + 'px';
            dropdownContainer.style.width = searchInput.offsetWidth + 'px';
            
            // 검색 처리
            handleOrderSetSearch(event);
        });
        
        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', function(event) {
            if (event.target !== searchInput && !dropdownContainer.contains(event.target)) {
                dropdownContainer.style.display = 'none';
            }
        });
        
        // Order Set 선택 해제를 위한 클릭 이벤트 리스너 추가
        document.addEventListener('click', function(event) {
            // 클릭한 요소가 order-set-item이나 order-set-content-item인지 확인
            const isOrderSetItem = event.target.closest('.order-set-item');
            const isOrderSetContentItem = event.target.closest('.order-set-content-item');
            const isOrderSetContainer = event.target.closest('.order-set-list-container') || 
                                        event.target.closest('.order-set-content-container');
            
            // 클릭한 요소가 OrderSet 항목이나 컨테이너가 아니면 선택 상태 해제
            if (!isOrderSetItem && !isOrderSetContentItem && !isOrderSetContainer) {
                document.querySelectorAll('.order-set-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // OrderSet 내용 컨테이너도 초기화
                const contentContainer = document.querySelector('.order-set-content-container');
                if (contentContainer) {
                    contentContainer.innerHTML = '';
                }
            }
        });
        
        // 컨테이너 높이와 footer를 정확히 계산하여 설정
        const rightBottomHeight = rightBottomArea.clientHeight;
        const footerHeight = 45; // footer 높이
        
        // 목록과 컨텐츠 컨테이너 높이 조정
        orderSetListContainer.style.height = `calc(100% - 145px)`;
        orderSetContentContainer.style.height = `calc(100% - 145px)`;
        
        // Footer 정확한 위치 설정
        orderSetFooter.style.position = 'absolute';
        orderSetFooter.style.bottom = '0';
        orderSetFooter.style.height = '51px';
        
        // OrderSet 목록 컨테이너와 내용 컨테이너 추가
        rightBottomArea.appendChild(orderSetListContainer);
        rightBottomArea.appendChild(orderSetContentContainer);
        
        // Footer 영역 추가
        rightBottomArea.appendChild(orderSetFooter);
        
        // OrderSet 목록 로드 및 표시
        loadOrderSets();
    }
}

// OrderSet 검색 처리
async function handleOrderSetSearch(event) {
    const searchInput = event.target;
    const searchTerm = searchInput.value.trim().toLowerCase();
    const dropdownContainer = document.querySelector('.order-set-search-dropdown');
    
    // 검색어가 없을 경우 드롭다운 숨기기
    if (searchTerm === '') {
        dropdownContainer.style.display = 'none';
        return;
    }
    
    // 드롭다운 표시
    dropdownContainer.style.display = 'block';
    
    // OrderSet 검색
    const searchResults = await searchOrderSets(searchTerm);
    displayOrderSetSearchResults(searchResults, dropdownContainer);
}

// OrderSet 검색
async function searchOrderSets(searchTerm) {
    try {
        // 현재 사용자 정보 가져오기
        const user = window.auth.currentUser;
        if (!user) {
            console.error('No user is signed in');
            return [];
        }
        
        const userEmail = user.email;
        // 이메일에서 병원명 추출 (예: mediqoredental.doctor.001@mediqore.com -> mediqoredental)
        const hospitalName = userEmail.split('.')[0];
        const orderSetsRef = collection(window.db, `hospitals/${hospitalName}/staff/${userEmail}/OrderSet`);
        
        // 모든 OrderSet 가져오기
        const q = query(orderSetsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const orderSets = [];
        querySnapshot.forEach(doc => {
            // 검색어와 일치하는 OrderSet만 필터링
            if (doc.id.toLowerCase().includes(searchTerm)) {
                orderSets.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        return orderSets;
        
    } catch (error) {
        console.error('Error searching OrderSets:', error);
        return [];
    }
}

// 검색 결과 표시
function displayOrderSetSearchResults(orderSets, dropdownContainer) {
    // 드롭다운 초기화
    dropdownContainer.innerHTML = '';
    
    if (orderSets.length === 0) {
        const noResultsItem = document.createElement('div');
        noResultsItem.className = 'order-set-search-item';
        noResultsItem.textContent = 'No results found';
        noResultsItem.style.padding = '8px 10px';
        noResultsItem.style.color = '#999';
        noResultsItem.style.fontStyle = 'italic';
        noResultsItem.style.fontSize = '12px';
        dropdownContainer.appendChild(noResultsItem);
        return;
    }
    
    // 검색 결과 항목 추가
    orderSets.forEach(orderSet => {
        const searchResultItem = document.createElement('div');
        searchResultItem.className = 'order-set-search-item';
        searchResultItem.textContent = orderSet.id;
        searchResultItem.style.padding = '8px 10px';
        searchResultItem.style.cursor = 'pointer';
        searchResultItem.style.borderBottom = '1px solid #eee';
        searchResultItem.style.fontSize = '12px';
        
        // 마우스 오버 효과
        searchResultItem.addEventListener('mouseover', () => {
            searchResultItem.style.backgroundColor = '#f0f0f0';
        });
        
        searchResultItem.addEventListener('mouseout', () => {
            searchResultItem.style.backgroundColor = 'white';
        });
        
        // 클릭 이벤트: 해당 OrderSet 선택
        searchResultItem.addEventListener('click', () => {
            // 드롭다운 닫기
            dropdownContainer.style.display = 'none';
            
            // OrderSet 목록에서 해당 항목 선택
            const orderSetItems = document.querySelectorAll('.order-set-item');
            orderSetItems.forEach(item => {
                if (item.getAttribute('data-order-set-id') === orderSet.id) {
                    // 선택된 OrderSet 하이라이트
                    document.querySelectorAll('.order-set-item').forEach(i => {
                        i.classList.remove('selected');
                    });
                    item.classList.add('selected');
                    
                    // 스크롤하여 선택된 항목 보이게 하기
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // OrderSet 내용 표시
                    displayOrderSetContent(orderSet);
                }
            });
        });
        
        dropdownContainer.appendChild(searchResultItem);
    });
}

// Firebase에서 OrderSet 목록 가져오기
async function loadOrderSets() {
    try {
        // 현재 사용자 정보 가져오기
        const user = window.auth.currentUser;
        if (!user) {
            console.error('No user is signed in');
            return;
        }
        
        const userEmail = user.email;
        // 이메일에서 병원명 추출 (예: mediqoredental.doctor.001@mediqore.com -> mediqoredental)
        const hospitalName = userEmail.split('.')[0];
        const orderSetsRef = collection(window.db, `hospitals/${hospitalName}/staff/${userEmail}/OrderSet`);
        
        // 생성일 기준 내림차순 정렬 (최신순)
        const q = query(orderSetsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const orderSets = [];
        querySnapshot.forEach(doc => {
            orderSets.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // OrderSet 목록 표시
        displayOrderSetList(orderSets);
        
    } catch (error) {
        console.error('Error loading OrderSets:', error);
    }
}

// OrderSet 목록 표시
function displayOrderSetList(orderSets) {
    const listContainer = document.querySelector('.order-set-list-container');
    if (!listContainer) return;
    
    // 컨테이너 초기화
    listContainer.innerHTML = '';
    
    if (orderSets.length === 0) {
        listContainer.innerHTML = '<div class="no-order-sets">No saved Order Sets</div>';
        return;
    }
    
    // OrderSet 아이템 생성
    orderSets.forEach(orderSet => {
        const orderSetItem = document.createElement('div');
        orderSetItem.className = 'order-set-item';
        orderSetItem.textContent = orderSet.id;
        orderSetItem.setAttribute('data-order-set-id', orderSet.id);
        
        // 클릭 이벤트: 해당 OrderSet의 내용을 표시
        orderSetItem.addEventListener('click', () => {
            // 선택된 OrderSet 하이라이트
            document.querySelectorAll('.order-set-item').forEach(item => {
                item.classList.remove('selected');
            });
            orderSetItem.classList.add('selected');
            
            // OrderSet 내용 표시
            displayOrderSetContent(orderSet);
        });
        
        listContainer.appendChild(orderSetItem);
    });
}

// 선택된 OrderSet의 내용 표시
function displayOrderSetContent(orderSet) {
    const contentContainer = document.querySelector('.order-set-content-container');
    if (!contentContainer) return;
    
    // 컨테이너 초기화
    contentContainer.innerHTML = '';
    
    // CC 섹션 생성
    const ccSection = document.createElement('div');
    ccSection.className = 'order-set-section';
    
    const ccHeader = document.createElement('div');
    ccHeader.className = 'order-set-section-header';
    ccHeader.textContent = 'CC';
    
    const ccDivider = document.createElement('div');
    ccDivider.className = 'order-set-divider';
    
    const ccContent = document.createElement('div');
    ccContent.className = 'order-set-section-content';
    
    // CC 항목 추가
    if (orderSet.cc && orderSet.cc.length > 0) {
        orderSet.cc.forEach(item => {
            const ccItem = document.createElement('div');
            ccItem.className = 'order-set-content-item';
            ccItem.textContent = item;
            ccContent.appendChild(ccItem);
        });
    } else {
        ccContent.innerHTML = '<div class="no-items">No CC items</div>';
    }
    
    // Medicines 섹션 생성
    const medicinesSection = document.createElement('div');
    medicinesSection.className = 'order-set-section';
    
    const medicinesHeader = document.createElement('div');
    medicinesHeader.className = 'order-set-section-header';
    medicinesHeader.textContent = 'Medicines';
    
    const medicinesDivider = document.createElement('div');
    medicinesDivider.className = 'order-set-divider';
    
    const medicinesContent = document.createElement('div');
    medicinesContent.className = 'order-set-section-content';
    
    // Medicines 항목 추가
    if (orderSet.medicines && orderSet.medicines.length > 0) {
        orderSet.medicines.forEach(item => {
            const medicineItem = document.createElement('div');
            medicineItem.className = 'order-set-content-item';
            medicineItem.textContent = item;
            medicinesContent.appendChild(medicineItem);
        });
    } else {
        medicinesContent.innerHTML = '<div class="no-items">No medicine items</div>';
    }
    
    // 섹션 구성 완료 및 컨테이너에 추가
    ccSection.appendChild(ccHeader);
    ccSection.appendChild(ccDivider);
    ccSection.appendChild(ccContent);
    
    medicinesSection.appendChild(medicinesHeader);
    medicinesSection.appendChild(medicinesDivider);
    medicinesSection.appendChild(medicinesContent);
    
    contentContainer.appendChild(ccSection);
    contentContainer.appendChild(medicinesSection);
}

// 모달 창 HTML 생성
function createOrderSetModal() {
    // 이미 모달이 존재하면 생성하지 않음
    if (document.getElementById('order-set-modal')) {
        return;
    }

    const modalHTML = `
        <div id="order-set-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Save as Order Set</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="order-set-name">Order Set Name</label>
                        <input type="text" id="order-set-name" class="form-input" placeholder="Enter order set name">
                    </div>
                    
                    <div class="order-set-items">
                        <h4>CC Items</h4>
                        <div id="order-set-cc-items" class="order-set-item-list">
                            <!-- CC 항목들이 여기에 동적으로 추가됨 -->
                        </div>
                        
                        <h4>Medicine Items</h4>
                        <div id="order-set-medicine-items" class="order-set-item-list">
                            <!-- Medicine 항목들이 여기에 동적으로 추가됨 -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="order-save-btn" class="btn btn-primary">Order Save</button>
                </div>
            </div>
        </div>
    `;

    // 모달 HTML을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 모달 닫기 버튼 이벤트 리스너 등록
    const closeBtn = document.querySelector('#order-set-modal .close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeOrderSetModal);
    }

    // Order Save 버튼 이벤트 리스너 등록
    const saveBtn = document.getElementById('order-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveOrderSet);
    }

    // 모달 외부 클릭 시 닫히도록 설정
    const modal = document.getElementById('order-set-modal');
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeOrderSetModal();
        }
    });
}

// 모달 창 열기
function openOrderSetModal() {
    // 현재 처방전의 CC와 Medicine 항목 가져오기
    const ccItems = getCCItems();
    const medicineItems = getMedicineItems();

    // 모달에 항목들 표시
    displayOrderSetItems(ccItems, medicineItems);

    // 모달 표시
    const modal = document.getElementById('order-set-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// 모달 창 닫기
function closeOrderSetModal() {
    const modal = document.getElementById('order-set-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // 입력 필드 초기화
    const nameInput = document.getElementById('order-set-name');
    if (nameInput) {
        nameInput.value = '';
    }
}

// 현재 처방전의 CC 항목들 가져오기
function getCCItems() {
    const ccItems = [];
    const ccElements = document.querySelectorAll('.cc-item');
    
    ccElements.forEach(item => {
        const text = item.querySelector('.cc-item-text').textContent.trim();
        ccItems.push(text);
    });
    
    return ccItems;
}

// 현재 처방전의 Medicine 항목들 가져오기
function getMedicineItems() {
    const medicineItems = [];
    const medicineElements = document.querySelectorAll('.medicine-item');
    
    medicineElements.forEach(item => {
        const text = item.querySelector('.medicine-item-text').textContent.trim();
        medicineItems.push(text);
    });
    
    return medicineItems;
}

// 모달에 CC와 Medicine 항목 표시
function displayOrderSetItems(ccItems, medicineItems) {
    // CC 항목 표시
    const ccContainer = document.getElementById('order-set-cc-items');
    if (ccContainer) {
        ccContainer.innerHTML = '';
        
        if (ccItems.length === 0) {
            ccContainer.innerHTML = '<p class="no-items">No CC items</p>';
        } else {
            ccItems.forEach(item => {
                ccContainer.innerHTML += `<div class="order-set-item">${item}</div>`;
            });
        }
    }
    
    // Medicine 항목 표시
    const medicineContainer = document.getElementById('order-set-medicine-items');
    if (medicineContainer) {
        medicineContainer.innerHTML = '';
        
        if (medicineItems.length === 0) {
            medicineContainer.innerHTML = '<p class="no-items">No medicine items</p>';
        } else {
            medicineItems.forEach(item => {
                medicineContainer.innerHTML += `<div class="order-set-item">${item}</div>`;
            });
        }
    }
}

// Order Set 저장
async function saveOrderSet() {
    // Order Set 이름 가져오기
    const orderSetName = document.getElementById('order-set-name').value.trim();
    
    // 이름이 비어있는지 확인
    if (!orderSetName) {
        alert('Please set the order name');
        return;
    }
    
    try {
        // 현재 사용자 정보 가져오기
        const user = window.auth.currentUser;
        if (!user) {
            console.error('No user is signed in');
            return;
        }
        
        // CC와 Medicine 항목 가져오기
        const ccItems = getCCItems();
        const medicineItems = getMedicineItems();
        
        // Firestore 경로 생성
        const userEmail = user.email;
        // 이메일에서 병원명 추출 (예: mediqoredental.doctor.001@mediqore.com -> mediqoredental)
        const hospitalName = userEmail.split('.')[0];
        const docRef = doc(window.db, `hospitals/${hospitalName}/staff/${userEmail}/OrderSet`, orderSetName);
        
        // Firestore에 데이터 저장
        await setDoc(docRef, {
            cc: ccItems,
            medicines: medicineItems,
            createdAt: new Date()
        });
        
        // 성공 메시지 표시
        alert(`Order set "${orderSetName}" has been saved successfully.`);
        
        // 목록 갱신
        loadOrderSets();
        
        // 모달 닫기
        closeOrderSetModal();
        
    } catch (error) {
        console.error('Error saving order set:', error);
        alert('Failed to save order set. Please try again.');
    }
}

// Order set 관련 CSS 스타일 추가
function addOrderSetStyles() {
    // 이미 스타일이 추가되어 있는지 확인
    if (document.getElementById('order-set-styles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'order-set-styles';
    styleElement.textContent = `
        /* Order Set 모달 스타일 */
        #order-set-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
        }
        
        #order-set-modal .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-width: 80%;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        #order-set-modal .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        #order-set-modal .modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        #order-set-modal .close-modal {
            font-size: 24px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }
        
        #order-set-modal .close-modal:hover {
            color: #666;
        }
        
        #order-set-modal .form-group {
            margin-bottom: 15px;
        }
        
        #order-set-modal label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            font-size: 14px;
            color: #555;
        }
        
        #order-set-modal .form-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        #order-set-modal h4 {
            margin: 15px 0 5px;
            font-size: 14px;
            color: #555;
        }
        
        #order-set-modal .order-set-item-list {
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
            background-color: #f9f9f9;
        }
        
        #order-set-modal .order-set-item {
            padding: 5px;
            margin-bottom: 5px;
            background-color: white;
            border: 1px solid #eee;
            border-radius: 3px;
            font-size: 13px;
        }
        
        #order-set-modal .no-items {
            color: #999;
            font-style: italic;
            font-size: 13px;
        }
        
        #order-set-modal .modal-footer {
            margin-top: 20px;
            text-align: right;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
        
        #order-set-modal .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        
        #order-set-modal .btn-primary {
            background-color: #4a6fdc;
            color: white;
        }
        
        #order-set-modal .btn-primary:hover {
            background-color: #3a5fc9;
        }
        
        /* OrderSet 브라우저 스타일 */
        .order-set-list-container {
            position: absolute;
            top: 90px; /* 가로선 아래부터 시작 */
            left: 5px; /* 왼쪽 여백 */
            width: calc(30% - 10px); /* 세로선 위치까지의 너비 (여백 고려) */
            height: calc(100% - 140px); /* footer 영역을 고려하여 높이 조정 */
            overflow-y: auto;
            padding-right: 5px;
            z-index: 1;
        }
        
        .order-set-content-container {
            position: absolute;
            top: 90px; /* 가로선 아래부터 시작 */
            left: calc(30% + 5px); /* 세로선 위치 이후부터 시작 */
            width: calc(70% - 15px); /* 남은 공간 너비 (여백 고려) */
            height: calc(100% - 140px); /* footer 영역을 고려하여 높이 조정 */
            overflow-y: auto;
            padding-left: 5px;
            z-index: 1;
        }
        
        .order-set-item {
            padding: 8px 10px;
            margin-bottom: 5px;
            background-color: #f8f9fa;
            border: 1px solid #eee;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .order-set-item:hover {
            background-color: #eef1f7;
            border-color: #dde;
        }
        
        .order-set-item.selected {
            background-color: #e7eeff;
        }
        
        .no-order-sets {
            color: #999;
            font-style: italic;
            font-size: 12px;
            padding: 10px;
            text-align: center;
        }
        
        .order-set-section {
            margin-bottom: 15px;
        }
        
        .order-set-section-header {
            font-size: 12px;
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
            margin-top : 10px;
        }
        
        .order-set-divider {
            height: 1px;
            background-color: #ccc;
            margin-bottom: 10px;
        }
        
        .order-set-section-content {
            padding: 0 5px;
        }
        
        .order-set-content-item {
            padding: 5px;
            margin-bottom: 5px;
            background-color: white;
            border: 1px solid #eee;
            border-radius: 3px;
            font-size: 10px;
        }
        
        /* OrderSet footer 영역 스타일 */
        .order-set-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            border-top: 1px solid #ccc; /* 위쪽 테두리 추가 */
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
            z-index: 1;
            box-sizing: border-box; /* 테두리를 높이에 포함시킴 */
            display: flex; /* 버튼 배치를 위한 flex 설정 */
            justify-content: flex-end; /* 버튼 오른쪽 정렬 */
            align-items: center; /* 세로 중앙 정렬 */
            padding-right: 15px; /* 우측 여백 */
        }
        
        /* Apply 버튼 스타일 */
        .order-set-apply-btn {
            padding: 8px 16px;
            background-color: rgb(0, 102, 255);
            color: white;
            border: none;
            border-radius: 6px;
            height: 33px;
            width: 80px; /* Delete/Save 버튼과 동일한 너비 */
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Apply 버튼 hover 효과 */
        .order-set-apply-btn:hover {
            background-color: rgb(0, 82, 204);
        }
        
        /* 비활성화된 Apply 버튼 스타일 */
        .order-set-apply-btn.disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            opacity: 0.7;
        }
    `;
    
    document.head.appendChild(styleElement);
}

// 페이지 로드 시 스타일 추가
document.addEventListener('DOMContentLoaded', addOrderSetStyles);
