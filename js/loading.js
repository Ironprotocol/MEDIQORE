document.addEventListener('DOMContentLoaded', function() {
    // URL에서 파라미터 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const stayOnLoading = urlParams.get('stay') === 'true';
    const redirectTime = urlParams.get('time');
    
    // 'stay=true' 파라미터가 있으면 리다이렉션하지 않음
    if (!stayOnLoading) {
        // 파라미터로 지정된 시간이 있으면 해당 시간 후에 리다이렉션
        if (redirectTime) {
            setTimeout(function() {
                window.location.href = 'data_page.html';
            }, parseInt(redirectTime) * 1000);
        } else {
            // 기본적으로 5초 후에 리다이렉션
            setTimeout(function() {
                window.location.href = 'data_page.html';
            }, 5000);
        }
    }
});
