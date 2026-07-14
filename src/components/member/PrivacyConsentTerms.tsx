// 개인정보 수집·이용 동의 약관 (회원가입 / 재동의 페이지 공통)
export function PrivacyConsentTerms() {
  return (
    <div className="border border-line rounded-md bg-paper-warm max-h-56 overflow-y-auto p-4 text-xs leading-relaxed text-ink space-y-3">
      <p className="text-ink-soft">
        SK Bioscience ECO Bio 도서관(이하 &quot;도서관&quot;)은 회원 가입 및
        서비스 제공을 위하여 아래와 같이 개인정보를 수집·이용합니다. 내용을
        확인하신 후 동의 여부를 선택하여 주시기 바랍니다.
      </p>

      <div className="space-y-1.5">
        <div className="font-semibold text-ink">수집·이용 내역</div>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr className="border-b border-line">
              <th className="text-left align-top py-1.5 pr-2 font-medium w-24 text-ink">
                수집 목적
              </th>
              <td className="py-1.5 text-ink-soft">
                사내 도서관 회원 등록, 도서 대출·반납 이력 관리, 회원 식별 및
                본인 확인
              </td>
            </tr>
            <tr className="border-b border-line">
              <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                수집 항목
              </th>
              <td className="py-1.5 text-ink-soft">이름, 사번, 부서명</td>
            </tr>
            <tr className="border-b border-line">
              <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                보유·이용 기간
              </th>
              <td className="py-1.5 text-ink-soft">
                동의일로부터 1년 (보유 기간 만료 전 동의 철회 시 즉시 파기)
              </td>
            </tr>
            <tr>
              <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                파기 방법
              </th>
              <td className="py-1.5 text-ink-soft">
                전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-1">
        <div className="font-semibold text-ink">
          동의 거부 권리 및 불이익 안내
        </div>
        <p className="text-ink-soft">
          귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
          다만, 동의를 거부하실 경우 사내 도서관 회원 가입 및 도서 대출
          서비스 이용이 제한될 수 있습니다.
        </p>
      </div>

      <div className="space-y-1">
        <div className="font-semibold text-ink">개인정보 처리자</div>
        <ul className="text-ink-soft list-disc pl-4 space-y-0.5">
          <li>기관명: SK바이오사이언스 주식회사</li>
          <li>서비스명: SK Bioscience ECO Bio 도서관</li>
          <li>문의처: 사내 도서관 담당 부서</li>
        </ul>
      </div>

      <p className="text-[10px] text-ink-muted pt-2 border-t border-line">
        본 약관은 「개인정보 보호법」 제15조 및 제22조에 따라 작성되었습니다.
      </p>
    </div>
  );
}
