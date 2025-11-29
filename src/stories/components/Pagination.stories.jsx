import { useState } from 'react';
import { Pagination, PaginationItem, PaginationEllipsis } from '../../components/Pagination';

export default {
  title: 'Components/Pagination',
  component: Pagination,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4">
      <Pagination>
        <PaginationItem prev disabled>&#8592; Prev</PaginationItem>
        <PaginationItem>1</PaginationItem>
        <PaginationItem active>2</PaginationItem>
        <PaginationItem>3</PaginationItem>
        <PaginationItem>4</PaginationItem>
        <PaginationItem>5</PaginationItem>
        <PaginationItem next>Next &#8594;</PaginationItem>
      </Pagination>
    </div>
  ),
};

export const WithEllipsis = {
  render: () => (
    <div className="ig-p-4">
      <Pagination>
        <PaginationItem prev>&#8592;</PaginationItem>
        <PaginationItem>1</PaginationItem>
        <PaginationEllipsis />
        <PaginationItem>4</PaginationItem>
        <PaginationItem active>5</PaginationItem>
        <PaginationItem>6</PaginationItem>
        <PaginationEllipsis />
        <PaginationItem>20</PaginationItem>
        <PaginationItem next>&#8594;</PaginationItem>
      </Pagination>
    </div>
  ),
};

export const Controlled = {
  render: function ControlledPagination() {
    const [page, setPage] = useState(1);
    const totalPages = 10;

    return (
      <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
        <p className="ig-text-sm ig-text-muted">Page {page} of {totalPages}</p>
        <Pagination>
          <PaginationItem prev disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            &#8592; Prev
          </PaginationItem>
          {[1, 2, 3, 4, 5].map(n => (
            <PaginationItem key={n} active={page === n} onClick={() => setPage(n)}>
              {n}
            </PaginationItem>
          ))}
          {totalPages > 5 && (
            <>
              <PaginationEllipsis />
              <PaginationItem active={page === totalPages} onClick={() => setPage(totalPages)}>
                {totalPages}
              </PaginationItem>
            </>
          )}
          <PaginationItem next disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next &#8594;
          </PaginationItem>
        </Pagination>
      </div>
    );
  },
};

export const Simple = {
  render: () => (
    <div className="ig-p-4">
      <Pagination>
        <PaginationItem prev>&#8592; Previous</PaginationItem>
        <PaginationItem next>Next &#8594;</PaginationItem>
      </Pagination>
    </div>
  ),
};
