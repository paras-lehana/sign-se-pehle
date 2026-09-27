/**
 * CameraButton: a labelled rear-camera file input that hands the photo to the parent.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CameraButton } from '../../components/features/camera/CameraButton';

describe('CameraButton', () => {
  it('asks the phone for the rear camera and accepts only images', () => {
    render(<CameraButton onFile={vi.fn()} />);
    const input = screen.getByLabelText(/Take a photo$/);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('capture', 'environment');
    expect(screen.getByText('Take a photo')).toBeVisible();
  });

  it('passes the captured photo to onFile and resets for a retake', async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<CameraButton onFile={onFile} />);
    const photo = new File(['jpeg-bytes'], 'page-1.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Take a photo$/);

    await user.upload(input, photo);

    expect(onFile).toHaveBeenCalledWith(photo);
    expect(input).toHaveValue('');
  });
});
