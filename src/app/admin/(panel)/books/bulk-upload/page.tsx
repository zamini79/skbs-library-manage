import { requireMaster } from "@/lib/auth/admin-auth";
import { BookBulkUploadForm } from "@/components/admin/BookBulkUploadForm";

export default async function AdminBooksBulkUploadPage() {
  await requireMaster();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">엑셀 일괄 업로드</h1>
        <p className="text-md text-muted-foreground mt-1">
          .xlsx 파일을 업로드해서 도서를 한 번에 등록합니다. 미리보기에서 정상/오류 행을 확인 후 적재.
        </p>
      </header>
      <BookBulkUploadForm />
    </div>
  );
}
