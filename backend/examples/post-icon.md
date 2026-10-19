# POST /api/icon - アイコンアップロードAPI

アカウント作成後にアイコン画像をアップロードするためのAPIです。

## エンドポイント

```
POST /api/icon
```

## リクエスト形式

`Content-Type: multipart/form-data`

### パラメータ

| フィールド名    | 型     | 必須 | 説明                                |
| --------------- | ------ | ---- | ----------------------------------- |
| `id`            | string | ✓    | ユーザーのUUID                      |
| `password_hash` | string | ✓    | SHA-256でハッシュ化されたパスワード |
| `icon`          | File   | ✓    | アイコン画像ファイル               |

### 画像処理仕様

- 画像は自動的に正方形にクロップされます（縦横の小さい方を基準に中央切り抜き）
- 256x256 ピクセルにリサイズされます
- PNG形式に変換されます
- 最大ファイルサイズ: 50MB

## レスポンス

### 成功時 (200 OK)

```json
{
  "success": true,
  "message": "情報を送信します",
  "icon_url": "https://bejtdrgjqofztlijwiwq.supabase.co/storage/v1/object/public/icons/<UUID>.png"
}
```

### エラー時

#### 必須パラメータ不足 (400 Bad Request)

```json
{
  "success": false,
  "message": "id が不正です"
}
```

```json
{
  "success": false,
  "message": "password_hash が不足しています"
}
```

```json
{
  "success": false,
  "message": "icon (ファイル) が不足しています"
}
```

#### 認証失敗 (401 Unauthorized)

```json
{
  "success": false,
  "message": "認証に失敗しました"
}
```

#### サーバーエラー (500 Internal Server Error)

```json
{
  "success": false,
  "message": "アイコンのストレージへの保存に失敗しました"
}
```

## サンプルコード

### 1. Fetch API (JavaScript/TypeScript)

```javascript
async function uploadIcon(id, passwordHash, imageFile) {
  const formData = new FormData();
  formData.append("id", id);
  formData.append("password_hash", passwordHash);
  formData.append("icon", imageFile);

  try {
    const response = await fetch("http://localhost:3000/api/icon", {
      method: "POST",
      body: formData,
      // Content-Type は自動設定されるため指定不要
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("アップロード失敗:", data.message);
      return null;
    }

    console.log("アップロード成功:", data.icon_url);
    return data.icon_url;
  } catch (error) {
    console.error("エラー:", error);
    return null;
  }
}

// 使用例
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    const userId = "your-uuid-here";
    const passwordHash = "your-sha256-password-hash";
    const iconUrl = await uploadIcon(userId, passwordHash, file);
    if (iconUrl) {
      // アイコンURLを使って画像を表示
      document.querySelector("img").src = iconUrl;
    }
  }
});
```

### 2. Axios (JavaScript/TypeScript)

```javascript
import axios from "axios";

async function uploadIcon(id, passwordHash, imageFile) {
  const formData = new FormData();
  formData.append("id", id);
  formData.append("password_hash", passwordHash);
  formData.append("icon", imageFile);

  try {
    const response = await axios.post(
      "http://localhost:3000/api/icon",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    console.log("アップロード成功:", response.data.icon_url);
    return response.data.icon_url;
  } catch (error) {
    if (error.response) {
      console.error("アップロード失敗:", error.response.data.message);
    } else {
      console.error("エラー:", error.message);
    }
    return null;
  }
}
```

### 3. React コンポーネント例

```tsx
import { useState } from "react";

interface IconUploadProps {
  userId: string;
  passwordHash: string;
}

export const IconUpload: React.FC<IconUploadProps> = ({
  userId,
  passwordHash,
}) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルのみ許可
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("id", userId);
    formData.append("password_hash", passwordHash);
    formData.append("icon", file);

    try {
      const response = await fetch("http://localhost:3000/api/icon", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "アップロードに失敗しました");
      }

      setIconUrl(data.icon_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && <p>アップロード中...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {iconUrl && (
        <div>
          <p>アップロード成功！</p>
          <img src={iconUrl} alt="アイコン" width="256" height="256" />
        </div>
      )}
    </div>
  );
};
```
