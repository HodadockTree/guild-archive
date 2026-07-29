-- R2 전환 전 단계: 외부 HTTPS 이미지 주소를 저장합니다.
-- 기존 imageDataUrl 컬럼과 데이터는 그대로 유지합니다.
ALTER TABLE activities ADD COLUMN imageUrl TEXT;
